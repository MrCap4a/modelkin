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

// Admin write-side (ТЗ §29) — create/read/update/publish/hide + file
// attachment. Authorization (ADMIN-only) is always the caller's
// responsibility, same convention as every other admin-facing use case in
// this codebase (custom-orders, authors).
export { createModel, type CreateModelInput } from "./application/create-model";
export { updateModel, type UpdateModelInput } from "./application/update-model";
export { publishModel } from "./application/publish-model";
export { hideModel } from "./application/hide-model";
export { listModelsForAdmin } from "./application/list-models-for-admin";
export { getModelForAdmin } from "./application/get-model-for-admin";
export { addModelImage, type AddModelImageResult } from "./application/add-model-image";
export { addModelFile, type AddModelFileResult } from "./application/add-model-file";
export type {
  ModelAdminStatus,
  ModelAdminSummary,
  ModelAdminDetail,
  ModelAdminTag,
  ModelAdminImage,
  ModelAdminFile,
  ModelAdminAuthor,
} from "./domain/model-admin";
// Pure Zod schema — re-exported here for server-side consumers (Server
// Actions). Client Components must import it from the concrete file
// (./domain/model-admin-schema) instead, never through this barrel — see
// that file's header comment for why.
export {
  modelAdminInputSchema,
  modelAdminUpdateSchema,
  type ModelAdminInput,
  type ModelAdminUpdateInput,
} from "./domain/model-admin-schema";
