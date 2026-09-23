/**
 * Admin read/write-side view types — unlike domain/model.ts (public,
 * PUBLISHED-only), these expose DRAFT/HIDDEN models and internal fields
 * (author id/email) needed by the /admin/models screens (ТЗ §29).
 */

export type ModelAdminStatus = "DRAFT" | "PUBLISHED" | "HIDDEN";

export interface ModelAdminTag {
  slug: string;
  name: string;
}

export interface ModelAdminImage {
  id: string;
  url: string;
  storageKey: string;
  sortOrder: number;
  alt: string | null;
}

export interface ModelAdminFile {
  id: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export interface ModelAdminAuthor {
  id: string;
  email: string;
  name: string | null;
}

/** Row shape for the /admin/models list screen. */
export interface ModelAdminSummary {
  id: string;
  slug: string;
  title: string;
  price: number;
  status: ModelAdminStatus;
  previewImageUrl: string | null;
  tags: ModelAdminTag[];
  createdAt: Date;
  publishedAt: Date | null;
}

/** Full row shape for the /admin/models/[id] edit screen. */
export interface ModelAdminDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  status: ModelAdminStatus;
  tags: ModelAdminTag[];
  images: ModelAdminImage[];
  files: ModelAdminFile[];
  author: ModelAdminAuthor | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  /** Manual SEO overrides — null means "use the automatic value" (see ARCHITECTURE.md). */
  seoTitle: string | null;
  seoDescription: string | null;
  noindex: boolean;
}
