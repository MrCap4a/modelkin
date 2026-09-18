import type { OwnedModelSummary } from "../domain/owned-model-summary";
import { listOwnershipsWithModel } from "../infrastructure/prisma-ownership-repository";

/** For the profile "Купленные модели" tab. */
export async function listOwnedModels(userId: string): Promise<OwnedModelSummary[]> {
  return listOwnershipsWithModel(userId);
}
