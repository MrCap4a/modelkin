// Public contract of the models module (public read side only — admin
// CRUD/publish/hide lives in a different module). Other modules and app/**
// should only ever import from here, never reach into application/* or
// infrastructure/* directly.

export { getModelBySlug } from "./application/get-model-by-slug";
export { getModelViewerSource } from "./application/get-model-viewer-source";
export type { ModelViewerSource } from "./application/get-model-viewer-source";
export { listPublishedModelSlugs } from "./application/list-published-model-slugs";
export { formatPriceRub } from "./domain/format-price";
export type { ModelDetail, ModelImageView, ModelTagView, ModelAuthorView } from "./domain/model";
