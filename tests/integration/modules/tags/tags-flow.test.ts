import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@infrastructure/database";

// `server-only` throws when required outside Next's "react-server" resolve
// condition, which Vitest doesn't provide — stub it to a no-op (same
// pattern as tests/integration/modules/models/model-admin-flow.test.ts).
vi.mock("server-only", () => ({}));

const { createTag } = await import("@modules/tags/application/create-tag");
const { renameTag } = await import("@modules/tags/application/rename-tag");
const { deleteTag } = await import("@modules/tags/application/delete-tag");
const { listTagsWithUsage } = await import("@modules/tags/application/list-tags");
const { listAuditLogs } = await import("@modules/audit");

function unique(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe("tags admin CRUD flow (integration — item 3, categories are admin-managed)", () => {
  let adminId: string;
  const createdTagIds: string[] = [];
  const createdModelIds: string[] = [];

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { email: `${unique("tags-admin")}@example.com`, passwordHash: "x", role: "ADMIN" },
    });
    adminId = admin.id;
  });

  afterAll(async () => {
    await prisma.modelTag.deleteMany({ where: { modelId: { in: createdModelIds } } });
    await prisma.model.deleteMany({ where: { id: { in: createdModelIds } } });
    await prisma.tag.deleteMany({ where: { id: { in: createdTagIds } } });
    await prisma.user.delete({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  it("creates a tag with a generated slug and audit-logs tag.created", async () => {
    const name = unique("Новая категория");
    const tag = await createTag({ name }, adminId);
    createdTagIds.push(tag.id);

    expect(tag.name).toBe(name);
    expect(tag.slug).toMatch(/^[a-z0-9-]+$/);

    const audit = await listAuditLogs({ event: "tag.created", entityType: "Tag", entityId: tag.id });
    expect(audit.items).toHaveLength(1);
  });

  it("renames a tag without changing its slug, and audit-logs tag.updated", async () => {
    const tag = await createTag({ name: unique("Исходное имя") }, adminId);
    createdTagIds.push(tag.id);
    const originalSlug = tag.slug;

    const renamed = await renameTag(tag.id, { name: "Обновлённое имя" }, adminId);

    expect(renamed.name).toBe("Обновлённое имя");
    expect(renamed.slug).toBe(originalSlug);

    const audit = await listAuditLogs({ event: "tag.updated", entityType: "Tag", entityId: tag.id });
    expect(audit.items).toHaveLength(1);
  });

  it("lists usage counts and deleting a tag detaches it from models without deleting them", async () => {
    const tag = await createTag({ name: unique("Категория с моделью") }, adminId);
    createdTagIds.push(tag.id);

    const model = await prisma.model.create({
      data: {
        title: unique("Модель для теста тега"),
        slug: unique("model-for-tag-test"),
        description: "Описание",
        price: 10_000,
        status: "DRAFT",
        tags: { create: [{ tagId: tag.id }] },
      },
    });
    createdModelIds.push(model.id);

    const withUsage = await listTagsWithUsage();
    const found = withUsage.find((t) => t.id === tag.id);
    expect(found?.modelCount).toBe(1);

    await deleteTag(tag.id, adminId);
    createdTagIds.splice(createdTagIds.indexOf(tag.id), 1);

    const stillExistsModel = await prisma.model.findUnique({ where: { id: model.id } });
    expect(stillExistsModel).not.toBeNull();

    const modelTags = await prisma.modelTag.findMany({ where: { modelId: model.id } });
    expect(modelTags).toHaveLength(0);

    const audit = await listAuditLogs({ event: "tag.deleted", entityType: "Tag", entityId: tag.id });
    expect(audit.items).toHaveLength(1);
  });

  it("rejects renaming a non-existent tag", async () => {
    await expect(renameTag("non-existent-id", { name: "X" }, adminId)).rejects.toThrow();
  });
});
