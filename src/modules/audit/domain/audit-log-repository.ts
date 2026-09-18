import type { AuditLogFilter, AuditLogPage, NewAuditLogEntry } from "./audit-log-entry";

export interface AuditLogRepository {
  record(entry: NewAuditLogEntry): Promise<void>;
  list(filter: AuditLogFilter): Promise<AuditLogPage>;
}
