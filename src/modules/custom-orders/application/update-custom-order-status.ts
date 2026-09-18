import "server-only";
import { recordAuditEvent } from "@modules/audit";
import { NotFoundError, ValidationError } from "@shared/errors";
import { CUSTOM_ORDER_STATUSES, type CustomOrderDetail, type CustomOrderStatus } from "../domain/custom-order";
import {
  getCustomOrderByIdRepo,
  updateCustomOrderStatusRepo,
} from "../infrastructure/prisma-custom-order-repository";

/**
 * For the admin panel (/admin/custom-orders, built by another agent) to
 * call after an admin changes a request's status. Records
 * `custom_order.status_changed` (ТЗ §30 — "custom order status changed" is
 * an explicitly required audit event). Authorization (ADMIN-only) is the
 * caller's responsibility — `adminId` is the already-authenticated admin's
 * user id, passed in rather than re-derived here so this use case stays
 * decoupled from @modules/auth's session/cookie plumbing.
 */
export async function updateCustomOrderStatus(
  id: string,
  status: CustomOrderStatus,
  adminId: string,
): Promise<CustomOrderDetail> {
  if (!CUSTOM_ORDER_STATUSES.includes(status)) {
    throw new ValidationError("Недопустимый статус заявки");
  }

  const existing = await getCustomOrderByIdRepo(id);
  if (!existing) {
    throw new NotFoundError("Заявка на индивидуальный заказ не найдена");
  }

  const updated = await updateCustomOrderStatusRepo(id, status);

  await recordAuditEvent({
    event: "custom_order.status_changed",
    actorUserId: adminId,
    actorRole: "ADMIN",
    entityType: "CustomOrder",
    entityId: id,
    metadata: { from: existing.status, to: status },
  });

  return updated;
}
