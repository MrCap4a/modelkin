// Public contract of the tags module. Other modules and app/** should only
// ever import from here, never reach into application/*or infrastructure/*
// directly.

export { listTags, listTagsWithUsage } from "./application/list-tags";
export { createTag } from "./application/create-tag";
export { renameTag } from "./application/rename-tag";
export { deleteTag } from "./application/delete-tag";
export { tagInputSchema, type TagInput } from "./domain/tag-schema";
export type { TagSummary, TagAdminSummary } from "./domain/tag";
