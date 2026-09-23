/**
 * Public read-side view types for a single model. Only ever populated from
 * PUBLISHED models (see application/get-model-by-slug.ts) — admin CRUD/DRAFT
 * handling is a different module's responsibility.
 */

export interface ModelImageView {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

export interface ModelTagView {
  slug: string;
  name: string;
  /** Whether /tag/{slug} exists as a public, indexable landing page for this tag. */
  seoIndexed: boolean;
}

export interface ModelAuthorView {
  name: string;
}

export interface ModelDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Price in kopecks — ТЗ §13, never a float. */
  price: number;
  images: ModelImageView[];
  tags: ModelTagView[];
  /** Present only when the model has an author AND that author has a display name (never falls back to email — авторская страница необязательна, но публичная утечка email недопустима). */
  author: ModelAuthorView | null;
  /** Whether an STL file exists to feed the lazy-loaded 3D viewer. */
  hasViewerModel: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
  /** Manual SEO overrides — null means "derive automatically", see generateMetadata. */
  seoTitle: string | null;
  seoDescription: string | null;
  noindex: boolean;
}
