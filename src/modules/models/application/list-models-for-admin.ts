import "server-only";
import type { ModelAdminStatus, ModelAdminSummary } from "../domain/model-admin";
import { listModelsForAdminRepo } from "../infrastructure/admin-model-repository";

/**
 * For the /admin/models list screen — unlike @modules/catalog (public,
 * PUBLISHED-only), this includes DRAFT/HIDDEN models too. Authorization
 * (ADMIN-only) is the caller's responsibility.
 */
export async function listModelsForAdmin(filter?: {
  status?: ModelAdminStatus;
  query?: string;
}): Promise<ModelAdminSummary[]> {
  return listModelsForAdminRepo(filter ?? {});
}
