import { countOwnership } from "../infrastructure/prisma-ownership-repository";

/** Used by the model-detail page to show purchase state. */
export async function isModelOwnedByUser(userId: string, modelId: string): Promise<boolean> {
  return (await countOwnership(userId, modelId)) > 0;
}
