// Public contract of the tags module. Other modules and app/** should only
// ever import from here, never reach into application/*or infrastructure/*
// directly.

export {
  listTags,
  listTagsWithUsage,
  getSeoTagPage,
  listSeoTagSlugs,
} from "./application/list-tags";
export { createTag } from "./application/create-tag";
export { renameTag } from "./application/rename-tag";
export { deleteTag } from "./application/delete-tag";
export { updateTagSeo } from "./application/update-tag-seo";
export {
  tagInputSchema,
  type TagInput,
  tagSeoInputSchema,
  type TagSeoInput,
} from "./domain/tag-schema";
export type { TagSummary, TagAdminSummary, TagSeoDetail, SeoTagPage } from "./domain/tag";
