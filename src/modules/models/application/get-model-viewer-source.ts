import { createPresignedDownloadUrl } from "@infrastructure/storage";
import {
  findPublishedModelIdBySlug,
  getFirstModelFileStorageKey,
} from "../infrastructure/model-repository";

export interface ModelViewerSource {
  url: string;
  expiresInSeconds: number;
}

/**
 * Short-lived signed GET URL so the in-browser 3D viewer (React Three Fiber
 * + STLLoader) can render the model's STL client-side, WITHOUT going through
 * the authenticated purchase-download flow (ownership isn't required to
 * rotate/zoom a preview — only to obtain the actual purchasable file via
 * `@modules/downloads`). Never persisted, never logged as a
 * `file.download` audit event — that event is specifically for the
 * ownership-gated download flow owned by the downloads module.
 *
 * Only resolves for PUBLISHED models — same visibility rule as
 * `getModelBySlug`, so a guest can't use the viewer endpoint to peek at a
 * DRAFT/HIDDEN model's file.
 */
export async function getModelViewerSource(slug: string): Promise<ModelViewerSource | null> {
  const modelId = await findPublishedModelIdBySlug(slug);
  if (!modelId) return null;

  const storageKey = await getFirstModelFileStorageKey(modelId);
  if (!storageKey) return null;

  // No `downloadFileName` — this is an inline in-browser render, not an
  // attachment download, so no Content-Disposition: attachment header.
  return createPresignedDownloadUrl({ key: storageKey });
}
