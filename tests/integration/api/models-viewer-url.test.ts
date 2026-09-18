import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@infrastructure/database";

// `server-only` is imported transitively via @modules/models — stub it so
// the route module (which imports @modules/models) loads under Vitest.
import { vi } from "vitest";
vi.mock("server-only", () => ({}));

const { GET } = await import("@/app/api/models/[slug]/viewer-url/route");

describe("GET /api/models/[slug]/viewer-url (API contract, unauthenticated by design)", () => {
  const suffix = randomUUID().slice(0, 8);
  let publishedModelId: string;
  const publishedSlug = `viewer-url-published-${suffix}`;
  const draftSlug = `viewer-url-draft-${suffix}`;
  const noFileSlug = `viewer-url-no-file-${suffix}`;

  beforeAll(async () => {
    const published = await prisma.model.create({
      data: {
        title: "Viewer URL test model",
        slug: publishedSlug,
        description: "desc",
        price: 10_000,
        status: "PUBLISHED",
        publishedAt: new Date(),
        files: { create: { storageKey: `models/${suffix}.stl`, originalName: "a.stl", mimeType: "model/stl", size: 100 } },
      },
    });
    publishedModelId = published.id;

    await prisma.model.create({
      data: {
        title: "Viewer URL draft model",
        slug: draftSlug,
        description: "desc",
        price: 10_000,
        status: "DRAFT",
        files: { create: { storageKey: `models/${suffix}-draft.stl`, originalName: "b.stl", mimeType: "model/stl", size: 100 } },
      },
    });

    await prisma.model.create({
      data: {
        title: "Viewer URL no-file model",
        slug: noFileSlug,
        description: "desc",
        price: 10_000,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await prisma.modelFile.deleteMany({ where: { model: { slug: { in: [publishedSlug, draftSlug, noFileSlug] } } } });
    await prisma.model.deleteMany({ where: { slug: { in: [publishedSlug, draftSlug, noFileSlug] } } });
    await prisma.$disconnect();
  });

  function request(slug: string): NextRequest {
    return new NextRequest(`http://localhost:3000/api/models/${slug}/viewer-url`);
  }

  it("returns a signed URL + expiry for a published model with an STL file", async () => {
    const response = await GET(request(publishedSlug), { params: Promise.resolve({ slug: publishedSlug }) });
    expect(response.status).toBe(200);

    const body = (await response.json()) as { url: string; expiresInSeconds: number };
    expect(body.url).toContain("http");
    expect(body.expiresInSeconds).toBeGreaterThan(0);
    void publishedModelId; // referenced for setup traceability only
  });

  it("returns 404 for a DRAFT model even though it has a file (not publicly visible)", async () => {
    const response = await GET(request(draftSlug), { params: Promise.resolve({ slug: draftSlug }) });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a published model with no STL file attached", async () => {
    const response = await GET(request(noFileSlug), { params: Promise.resolve({ slug: noFileSlug }) });
    expect(response.status).toBe(404);
  });

  it("returns 404 for an unknown slug", async () => {
    const response = await GET(request("no-such-model-slug"), {
      params: Promise.resolve({ slug: "no-such-model-slug" }),
    });
    expect(response.status).toBe(404);
  });
});
