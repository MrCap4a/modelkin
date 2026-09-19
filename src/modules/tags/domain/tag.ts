export interface TagSummary {
  id: string;
  slug: string;
  name: string;
}

/** Admin list view — includes how many models use the tag, for a safe-delete decision. */
export interface TagAdminSummary extends TagSummary {
  modelCount: number;
}
