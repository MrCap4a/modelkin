/**
 * Canonical set of audit-worthy events (ТЗ §30). Kept as a closed union
 * (rather than a free-form string) so every module records events under a
 * consistent, greppable vocabulary instead of inventing ad-hoc names.
 */
export type AuditEventName =
  // Authentication
  | "auth.login_success"
  | "auth.login_failure"
  | "auth.logout"
  | "auth.register"
  | "auth.password_change"
  | "auth.password_reset_requested"
  | "auth.password_reset_completed"
  // Admin
  | "model.created"
  | "model.updated"
  | "model.published"
  | "model.hidden"
  | "model.deleted"
  | "user.role_changed"
  | "user.updated_by_admin"
  | "custom_order.status_changed"
  // Commerce
  | "cart.item_added"
  | "cart.item_removed"
  | "order.created"
  | "payment.status_changed"
  | "ownership.created"
  | "order.refunded"
  // Authors (extension)
  | "author.payout_requested"
  | "author.payout_status_changed"
  // Files
  | "file.upload"
  | "file.download"
  | "file.download_denied";

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  actorUserId?: string;
  actorRole?: string;
  event: AuditEventName;
  entityType?: string;
  entityId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}

export type NewAuditLogEntry = Omit<AuditLogEntry, "id" | "timestamp">;

export interface AuditLogFilter {
  event?: AuditEventName;
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}
