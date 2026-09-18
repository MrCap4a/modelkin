import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@infrastructure/database";

// `server-only` throws when required outside Next's "react-server" resolve
// condition, which Vitest doesn't provide. Stub it to a no-op so use cases
// marked `import "server-only"` are importable under test — same pattern as
// tests/integration/modules/custom-orders/custom-order-flow.test.ts.
vi.mock("server-only", () => ({}));

const { createModel } = await import("@modules/models/application/create-model");
const { updateModel } = await import("@modules/models/application/update-model");
const { publishModel } = await import("@modules/models/application/publish-model");
const { hideModel } = await import("@modules/models/application/hide-model");
const { addModelImage } = await import("@modules/models/application/add-model-image");
const { addModelFile } = await import("@modules/models/application/add-model-file");
const { getModelForAdmin } = await import("@modules/models/application/get-model-for-admin");
const { listAuditLogs } = await import("@modules/audit");

function unique(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe("models admin CRUD flow (integration, ТЗ §29/§30)", () => {
  let adminId: string;
  let authorId: string;
  let authorEmail: string;
  let tagId: string;
  let tagSlug: string;
  const createdModelIds: string[] = [];

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { email: `${unique("model-admin")}@example.com`, passwordHash: "x", role: "ADMIN" },
    });
    adminId = admin.id;

    authorEmail = `${unique("model-author")}@example.com`;
    const author = await prisma.user.create({
      data: { email: authorEmail, passwordHash: "x", role: "USER" },
    });
    authorId = author.id;

    tagSlug = unique("test-tag");
    const tag = await prisma.tag.create({ data: { name: "Тестовый тег", slug: tagSlug } });
    tagId = tag.id;
  });

  afterAll(async () => {
    await prisma.modelImage.deleteMany({ where: { modelId: { in: createdModelIds } } });
    await prisma.modelFile.deleteMany({ where: { modelId: { in: createdModelIds } } });
    await prisma.modelTag.deleteMany({ where: { modelId: { in: createdModelIds } } });
    await prisma.model.deleteMany({ where: { id: { in: createdModelIds } } });
    await prisma.tag.delete({ where: { id: tagId } });
    await prisma.user.delete({ where: { id: authorId } });
    await prisma.user.delete({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  it("creates a model as DRAFT, attaches the given tags/author, generates a slug, and audit-logs model.created", async () => {
    const title = unique("Кронштейн для наушников");
    const model = await createModel(
      {
        title,
        description: "Удобное крепление под стол",
        price: 29_000,
        tagSlugs: [tagSlug],
        authorEmail,
      },
      adminId,
    );
    createdModelIds.push(model.id);

    expect(model.status).toBe("DRAFT");
    expect(model.publishedAt).toBeNull();
    expect(model.slug).toMatch(/^[a-z0-9-]+$/);
    expect(model.tags.map((t) => t.slug)).toContain(tagSlug);
    expect(model.author?.email).toBe(authorEmail);

    const audit = await listAuditLogs({ event: "model.created", entityType: "Model", entityId: model.id });
    expect(audit.items.length).toBeGreaterThanOrEqual(1);
    expect(audit.items[0]?.actorUserId).toBe(adminId);
    expect(audit.items[0]?.actorRole).toBe("ADMIN");
  });

  it("generates distinct slugs for two models created with the identical title", async () => {
    const title = unique("Одинаковое название") + " ФИКС"; // stable across both calls below
    const fixedTitle = "Повторяющееся название модели";

    const first = await createModel(
      { title: fixedTitle, description: "Первая модель с этим названием", price: 10_000, tagSlugs: [] },
      adminId,
    );
    const second = await createModel(
      { title: fixedTitle, description: "Вторая модель с этим названием", price: 10_000, tagSlugs: [] },
      adminId,
    );
    createdModelIds.push(first.id, second.id);
    void title;

    expect(first.slug).not.toBe(second.slug);
    expect(second.slug.startsWith(first.slug)).toBe(true);
  });

  it("rejects createModel when authorEmail doesn't belong to a registered user", async () => {
    await expect(
      createModel(
        {
          title: unique("Модель с несуществующим автором"),
          description: "Описание модели",
          price: 15_000,
          tagSlugs: [],
          authorEmail: `${unique("ghost")}@nowhere.example`,
        },
        adminId,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects publishing a model with no preview image and no STL file", async () => {
    const model = await createModel(
      { title: unique("Модель без файлов"), description: "Ещё нет файлов", price: 12_000, tagSlugs: [] },
      adminId,
    );
    createdModelIds.push(model.id);

    await expect(publishModel(model.id, adminId)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("publishes once an image and a file are attached, and audit-logs model.published", async () => {
    const model = await createModel(
      { title: unique("Модель готовая к публикации"), description: "Полностью готова", price: 22_000, tagSlugs: [] },
      adminId,
    );
    createdModelIds.push(model.id);

    await addModelImage(model.id, `previews/${unique("key")}.jpg`, adminId);
    await addModelFile(model.id, `models/${unique("key")}.stl`, "part.stl", "application/octet-stream", 4096, adminId);

    const published = await publishModel(model.id, adminId);
    expect(published.status).toBe("PUBLISHED");
    expect(published.publishedAt).not.toBeNull();
    expect(published.images).toHaveLength(1);
    expect(published.files).toHaveLength(1);

    const audit = await listAuditLogs({ event: "model.published", entityType: "Model", entityId: model.id });
    expect(audit.items.length).toBeGreaterThanOrEqual(1);
  });

  it("hides a published model and audit-logs model.hidden", async () => {
    const model = await createModel(
      { title: unique("Модель для скрытия"), description: "Будет скрыта", price: 18_000, tagSlugs: [] },
      adminId,
    );
    createdModelIds.push(model.id);
    await addModelImage(model.id, `previews/${unique("key")}.jpg`, adminId);
    await addModelFile(model.id, `models/${unique("key")}.stl`, "part.stl", "application/octet-stream", 2048, adminId);
    await publishModel(model.id, adminId);

    const hidden = await hideModel(model.id, adminId);
    expect(hidden.status).toBe("HIDDEN");

    const audit = await listAuditLogs({ event: "model.hidden", entityType: "Model", entityId: model.id });
    expect(audit.items.length).toBeGreaterThanOrEqual(1);
  });

  it("updates title/description/price/tags and audit-logs model.updated", async () => {
    const model = await createModel(
      { title: unique("Модель до правок"), description: "Старое описание", price: 5_000, tagSlugs: [] },
      adminId,
    );
    createdModelIds.push(model.id);

    const updated = await updateModel(
      model.id,
      { title: "Новое название", description: "Новое описание модели подробнее", price: 7_500, tagSlugs: [tagSlug] },
      adminId,
    );

    expect(updated.title).toBe("Новое название");
    expect(updated.description).toBe("Новое описание модели подробнее");
    expect(updated.price).toBe(7_500);
    expect(updated.tags.map((t) => t.slug)).toEqual([tagSlug]);
    // Slug must NOT change on a title edit — it's the model's public URL.
    expect(updated.slug).toBe(model.slug);

    const audit = await listAuditLogs({ event: "model.updated", entityType: "Model", entityId: model.id });
    expect(audit.items.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects updateModel when the new authorEmail doesn't belong to a registered user", async () => {
    const model = await createModel(
      { title: unique("Модель для проверки автора"), description: "Описание модели", price: 9_000, tagSlugs: [] },
      adminId,
    );
    createdModelIds.push(model.id);

    await expect(
      updateModel(model.id, { authorEmail: `${unique("ghost2")}@nowhere.example` }, adminId),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("clears the author when authorEmail is updated to an empty string", async () => {
    const model = await createModel(
      {
        title: unique("Модель с автором для очистки"),
        description: "Описание модели",
        price: 9_000,
        tagSlugs: [],
        authorEmail,
      },
      adminId,
    );
    createdModelIds.push(model.id);
    expect(model.author?.email).toBe(authorEmail);

    const updated = await updateModel(model.id, { authorEmail: "" }, adminId);
    expect(updated.author).toBeNull();
  });

  it("getModelForAdmin returns full detail including DRAFT models (unlike the public read side)", async () => {
    const model = await createModel(
      { title: unique("Черновик для админки"), description: "Только для админа", price: 4_000, tagSlugs: [] },
      adminId,
    );
    createdModelIds.push(model.id);

    const detail = await getModelForAdmin(model.id);
    expect(detail?.status).toBe("DRAFT");
    expect(detail?.id).toBe(model.id);
  });
});
