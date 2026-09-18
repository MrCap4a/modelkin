"use server";

import { requireUser } from "@modules/auth";
import { getSignedDownloadUrl } from "@modules/downloads";
import { toSafeError } from "@shared/errors";

export type DownloadUrlResult =
  | { ok: true; data: { url: string; fileName: string } }
  | { ok: false; error: string };

export async function getDownloadUrlAction(modelId: string): Promise<DownloadUrlResult> {
  try {
    const user = await requireUser();
    const data = await getSignedDownloadUrl(user.id, modelId);
    return { ok: true, data };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message };
  }
}
