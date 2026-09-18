import "server-only";
import type { ModelAdminDetail } from "../domain/model-admin";
import { findModelDetailForAdmin } from "../infrastructure/admin-model-repository";

/**
 * For the /admin/models/[id] edit screen — full detail including
 * files/images/tags/author, regardless of status (DRAFT/PUBLISHED/HIDDEN).
 * Authorization (ADMIN-only) is the caller's responsibility.
 */
export async function getModelForAdmin(modelId: string): Promise<ModelAdminDetail | null> {
  return findModelDetailForAdmin(modelId);
}
