import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@infrastructure/database";
import { recordAuditEvent } from "@modules/audit";
import { NotFoundError, ValidationError } from "@shared/errors";
import type { ModelAdminDetail } from "../domain/model-admin";
import { findTagIdsBySlugs, findUserIdByEmail } from "../infrastructure/admin-model-repository";
import { getModelForAdmin } from "./get-model-for-admin";

export interface UpdateModelInput {
  title?: string;
  description?: string;
  /** Kopecks — ТЗ §13, never a float. */
  price?: number;
  tagSlugs?: string[];
  /**
   * Same rule as createModel: must be an existing registered user's email.
   * Pass an empty string to clear the model's author.
   */
  authorEmail?: string;
  /** Manual SEO overrides — pass an empty string to clear back to automatic. */
  seoTitle?: string;
  seoDescription?: string;
  noindex?: boolean;
}

/**
 * Admin CRUD — update (ТЗ §29). Partial: only fields present on `input` are
 * changed. Deliberately never regenerates `slug` from a new title — the
 * slug is the model's public URL, and silently changing it on every edit
 * would break already-shared/indexed links.
 */
export async function updateModel(
  modelId: string,
  input: UpdateModelInput,
  actorId: string,
): Promise<ModelAdminDetail> {
  const existing = await prisma.model.findUnique({ where: { id: modelId }, select: { id: true } });
  if (!existing) {
    throw new NotFoundError("Модель не найдена");
  }

  const data: Prisma.ModelUpdateInput = {};
  const changedFields: string[] = [];

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) {
      throw new ValidationError("Название модели обязательно");
    }
    data.title = title;
    changedFields.push("title");
  }

  if (input.description !== undefined) {
    const description = input.description.trim();
    if (!description) {
      throw new ValidationError("Описание модели обязательно");
    }
    data.description = description;
    changedFields.push("description");
  }

  if (input.price !== undefined) {
    if (!Number.isInteger(input.price) || input.price <= 0) {
      throw new ValidationError("Цена должна быть положительным целым числом (в копейках)");
    }
    data.price = input.price;
    changedFields.push("price");
  }

  if (input.authorEmail !== undefined) {
    const trimmed = input.authorEmail.trim();
    if (!trimmed) {
      data.author = { disconnect: true };
    } else {
      const authorId = await findUserIdByEmail(trimmed);
      if (!authorId) {
        throw new ValidationError(
          `Пользователь с email «${trimmed}» не найден — автором модели может быть только уже зарегистрированный пользователь`,
        );
      }
      data.author = { connect: { id: authorId } };
    }
    changedFields.push("authorEmail");
  }

  if (input.seoTitle !== undefined) {
    data.seoTitle = input.seoTitle.trim() || null;
    changedFields.push("seoTitle");
  }

  if (input.seoDescription !== undefined) {
    data.seoDescription = input.seoDescription.trim() || null;
    changedFields.push("seoDescription");
  }

  if (input.noindex !== undefined) {
    data.noindex = input.noindex;
    changedFields.push("noindex");
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.model.update({ where: { id: modelId }, data });
    }

    if (input.tagSlugs !== undefined) {
      const tags = await findTagIdsBySlugs(input.tagSlugs);
      await tx.modelTag.deleteMany({ where: { modelId } });
      if (tags.length > 0) {
        await tx.modelTag.createMany({ data: tags.map((tag) => ({ modelId, tagId: tag.id })) });
      }
      changedFields.push("tags");
    }
  });

  await recordAuditEvent({
    event: "model.updated",
    actorUserId: actorId,
    actorRole: "ADMIN",
    entityType: "Model",
    entityId: modelId,
    metadata: { changedFields },
  });

  const detail = await getModelForAdmin(modelId);
  if (!detail) {
    throw new NotFoundError("Модель не найдена после обновления");
  }
  return detail;
}
