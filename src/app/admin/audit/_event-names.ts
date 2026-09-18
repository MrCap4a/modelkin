import type { AuditEventName } from "@modules/audit";

/**
 * Mirrors the closed `AuditEventName` union in
 * @modules/audit/domain/audit-log-entry.ts — kept here (not in that module)
 * purely to populate the /admin/audit event-type filter dropdown; the
 * module itself doesn't export a runtime array of the type, only the type.
 */
export const AUDIT_EVENT_NAMES: AuditEventName[] = [
  "auth.login_success",
  "auth.login_failure",
  "auth.logout",
  "auth.register",
  "auth.password_change",
  "auth.password_reset_requested",
  "auth.password_reset_completed",
  "model.created",
  "model.updated",
  "model.published",
  "model.hidden",
  "model.deleted",
  "user.role_changed",
  "user.updated_by_admin",
  "custom_order.status_changed",
  "cart.item_added",
  "cart.item_removed",
  "order.created",
  "payment.status_changed",
  "ownership.created",
  "order.refunded",
  "author.payout_requested",
  "author.payout_status_changed",
  "file.upload",
  "file.download",
  "file.download_denied",
];
