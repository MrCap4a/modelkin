import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@infrastructure/database";
import { getSignedDownloadUrl, isModelOwnedByUser, listOwnedModels } from "@modules/downloads";
import { AuthorizationError, NotFoundError } from "@shared/errors";
import { listAuditLogs } from "@modules/audit";

/**
 * Download authorization flow (ТЗ §21 exactly: authenticated request →
 * ownership check → signed URL). This is the money/security-critical path
 * gating access to the private STL file, so it gets integration coverage
 * independent of the E2E purchase flow (which only exercises the happy
 * path).
 */
describe("getSignedDownloadUrl / ownership (integration)", () => {
  const suffix = randomUUID().slice(0, 8);
  let ownerId: string;
  let strangerId: string;
  let modelId: string;
  let modelWithoutFileId: string;

  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: { email: `download-owner-${suffix}@test.local`, passwordHash: "x" },
    });
    ownerId = owner.id;

    const stranger = await prisma.user.create({
      data: { email: `download-stranger-${suffix}@test.local`, passwordHash: "x" },
    });
    strangerId = stranger.id;

    const model = await prisma.model.create({
      data: {
        title: "Download authorization test model",
        slug: `download-auth-${suffix}`,
        description: "desc",
        price: 15_000,
        status: "PUBLISHED",
        publishedAt: new Date(),
        files: {
          create: {
            storageKey: `models/${suffix}.stl`,
            originalName: `${suffix}.stl`,
            mimeType: "model/stl",
            size: 4096,
          },
        },
      },
    });
    modelId = model.id;

    const modelWithoutFile = await prisma.model.create({
      data: {
        title: "Download authorization test model without file",
        slug: `download-auth-no-file-${suffix}`,
        description: "desc",
        price: 10_000,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    modelWithoutFileId = modelWithoutFile.id;

    // Grant ownership directly (this test targets the download-authorization
    // use case in isolation, not the payment flow that normally creates it).
    const orderItem = await prisma.order.create({
      data: {
        userId: ownerId,
        status: "PAID",
        totalAmount: 15_000,
        items: {
          create: { modelId, titleSnapshot: model.title, priceSnapshot: 15_000 },
        },
      },
      include: { items: true },
    });
    await prisma.userModelOwnership.create({
      data: { userId: ownerId, modelId, orderItemId: orderItem.items[0]!.id },
    });
  });

  afterAll(async () => {
    await prisma.userModelOwnership.deleteMany({ where: { userId: ownerId } });
    await prisma.orderItem.deleteMany({ where: { model: { id: modelId } } });
    await prisma.order.deleteMany({ where: { userId: ownerId } });
    await prisma.modelFile.deleteMany({ where: { modelId } });
    await prisma.model.deleteMany({ where: { id: { in: [modelId, modelWithoutFileId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, strangerId] } } });
    await prisma.$disconnect();
  });

  it("isModelOwnedByUser reflects ownership correctly for owner vs stranger", async () => {
    expect(await isModelOwnedByUser(ownerId, modelId)).toBe(true);
    expect(await isModelOwnedByUser(strangerId, modelId)).toBe(false);
  });

  it("listOwnedModels lists the model for the owner only", async () => {
    const ownerModels = await listOwnedModels(ownerId);
    expect(ownerModels.map((m) => m.modelId)).toContain(modelId);

    const strangerModels = await listOwnedModels(strangerId);
    expect(strangerModels.map((m) => m.modelId)).not.toContain(modelId);
  });

  it("denies a non-owner with AuthorizationError and audit-logs file.download_denied", async () => {
    await expect(getSignedDownloadUrl(strangerId, modelId)).rejects.toBeInstanceOf(AuthorizationError);

    const audit = await listAuditLogs({ event: "file.download_denied", actorUserId: strangerId });
    expect(audit.items.length).toBeGreaterThanOrEqual(1);
    expect(audit.items[0]?.entityId).toBe(modelId);
  });

  it("returns a signed URL for the owner and audit-logs file.download", async () => {
    const result = await getSignedDownloadUrl(ownerId, modelId);
    expect(result.url).toContain("http");
    expect(result.fileName).toBe(`${suffix}.stl`);

    const audit = await listAuditLogs({ event: "file.download", actorUserId: ownerId });
    expect(audit.items.some((item) => item.entityId === modelId)).toBe(true);
  });

  it("throws NotFoundError when the owned model has no file attached", async () => {
    const order = await prisma.order.create({
      data: {
        userId: ownerId,
        status: "PAID",
        totalAmount: 10_000,
        items: {
          create: {
            modelId: modelWithoutFileId,
            titleSnapshot: "no file",
            priceSnapshot: 10_000,
          },
        },
      },
      include: { items: true },
    });
    await prisma.userModelOwnership.create({
      data: { userId: ownerId, modelId: modelWithoutFileId, orderItemId: order.items[0]!.id },
    });

    await expect(getSignedDownloadUrl(ownerId, modelWithoutFileId)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
