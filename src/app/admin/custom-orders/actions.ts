"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@modules/auth";
import {
  getCustomOrderDetail,
  updateCustomOrderStatus,
  type CustomOrderDetail,
  type CustomOrderStatus,
} from "@modules/custom-orders";
import { createPresignedDownloadUrl } from "@infrastructure/storage";
import { NotFoundError, toSafeError } from "@shared/errors";
import { recordAuditEvent } from "@modules/audit";
import { fieldErrorsFrom, type ActionResult } from "../_lib/action-result";

export async function updateCustomOrderStatusAction(
  id: string,
  status: CustomOrderStatus,
): Promise<ActionResult<CustomOrderDetail>> {
  try {
    const admin = await requireAdmin();
    const detail = await updateCustomOrderStatus(id, status, admin.id);
    revalidatePath("/admin/custom-orders");
    revalidatePath(`/admin/custom-orders/${id}`);
    return { ok: true, data: detail };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message, fieldErrors: fieldErrorsFrom(body.error.details) };
  }
}

/**
 * Custom-order attachments live under the private `custom-orders/` storage
 * prefix (ТЗ §19/§21) and have no per-user ownership concept the way a
 * purchased model does — gating here is simply "the caller is ADMIN", not
 * "the caller owns this file", so this goes straight to
 * @infrastructure/storage's presigned-URL primitive rather than through
 * @modules/downloads (which is specifically shaped around
 * UserModelOwnership checks). A missing/failed lookup is recorded as
 * `file.download_denied` (ТЗ §30 — required audit event for files).
 */
export async function getCustomOrderFileDownloadUrlAction(
  customOrderId: string,
  fileId: string,
): Promise<ActionResult<{ url: string }>> {
  try {
    const admin = await requireAdmin();
    const order = await getCustomOrderDetail(customOrderId);
    const file = order?.files.find((f) => f.id === fileId);

    if (!order || !file) {
      await recordAuditEvent({
        event: "file.download_denied",
        actorUserId: admin.id,
        actorRole: "ADMIN",
        entityType: "CustomOrderFile",
        entityId: fileId,
        metadata: { reason: "not_found", customOrderId },
      });
      throw new NotFoundError("Файл не найден");
    }

    const { url } = await createPresignedDownloadUrl({ key: file.storageKey, downloadFileName: file.originalName });

    await recordAuditEvent({
      event: "file.download",
      actorUserId: admin.id,
      actorRole: "ADMIN",
      entityType: "CustomOrderFile",
      entityId: fileId,
      metadata: { customOrderId },
    });

    return { ok: true, data: { url } };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message, fieldErrors: fieldErrorsFrom(body.error.details) };
  }
}
