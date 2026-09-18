import "server-only";
import { prisma } from "@infrastructure/database";
import { recordAuditEvent } from "@modules/audit";
import { NotFoundError, ValidationError } from "@shared/errors";
import { generateUniqueSlug } from "../domain/generate-slug";
import type { ModelAdminDetail } from "../domain/model-admin";
import { findTagIdsBySlugs, findUserIdByEmail, modelSlugExists } from "../infrastructure/admin-model-repository";
import { getModelForAdmin } from "./get-model-for-admin";

export interface CreateModelInput {
  title: string;
  description: string;
  /** Kopecks — ТЗ §13, never a float. */
  price: number;
  tagSlugs?: string[];
  /**
   * Must be an existing registered user's email — validated against the
   * real `User` table, never accepted as freeform text (see ARCHITECTURE.md
   * → "Расширение: модуль authors" for why this is a deliberate product
   * decision rather than a free-text "author name" field).
   */
  authorEmail?: string;
}

function assertValidCoreFields(title: string, description: string, price: number): void {
  if (!title) {
    throw new ValidationError("Название модели обязательно");
  }
  if (!description) {
    throw new ValidationError("Описание модели обязательно");
  }
  if (!Number.isInteger(price) || price <= 0) {
    throw new ValidationError("Цена должна быть положительным целым числом (в копейках)");
  }
}

/**
 * Admin CRUD — create (ТЗ §29). Creates as DRAFT; publishing is a separate
 * explicit step (see publish-model.ts) so a half-finished listing never
 * becomes visible in the public catalog by accident.
 */
export async function createModel(input: CreateModelInput, actorId: string): Promise<ModelAdminDetail> {
  const title = input.title.trim();
  const description = input.description.trim();
  assertValidCoreFields(title, description, input.price);

  let authorId: string | undefined;
  if (input.authorEmail && input.authorEmail.trim()) {
    const foundId = await findUserIdByEmail(input.authorEmail);
    if (!foundId) {
      throw new ValidationError(
        `Пользователь с email «${input.authorEmail.trim()}» не найден — автором модели может быть только уже зарегистрированный пользователь`,
      );
    }
    authorId = foundId;
  }

  const tagSlugs = input.tagSlugs ?? [];
  const tags = await findTagIdsBySlugs(tagSlugs);

  const slug = await generateUniqueSlug(title, modelSlugExists);

  const model = await prisma.model.create({
    data: {
      title,
      slug,
      description,
      price: input.price,
      status: "DRAFT",
      authorId,
      tags: { create: tags.map((tag) => ({ tagId: tag.id })) },
    },
    select: { id: true },
  });

  await recordAuditEvent({
    event: "model.created",
    actorUserId: actorId,
    actorRole: "ADMIN",
    entityType: "Model",
    entityId: model.id,
    metadata: { title, slug, authorId: authorId ?? null },
  });

  const detail = await getModelForAdmin(model.id);
  if (!detail) {
    throw new NotFoundError("Модель не найдена сразу после создания");
  }
  return detail;
}
