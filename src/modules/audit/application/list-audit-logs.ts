import type { AuditLogFilter, AuditLogPage } from "../domain/audit-log-entry";
import { PrismaAuditLogRepository } from "../infrastructure/prisma-audit-log-repository";

const repository = new PrismaAuditLogRepository();

/** Used by the /admin/audit screen. Authorization (ADMIN-only) is the caller's responsibility. */
export async function listAuditLogs(filter: AuditLogFilter): Promise<AuditLogPage> {
  return repository.list(filter);
}
