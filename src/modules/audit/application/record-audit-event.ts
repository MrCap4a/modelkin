import { getLogger, getRequestId } from "@shared/logging";
import type { NewAuditLogEntry } from "../domain/audit-log-entry";
import { PrismaAuditLogRepository } from "../infrastructure/prisma-audit-log-repository";
import { writeAuditLogLine } from "../infrastructure/audit-file-writer";

const repository = new PrismaAuditLogRepository();

/**
 * Records a single audit event to both the queryable DB table (for
 * /admin/audit) and the daily-rotated audit.log file (ТЗ §33). Other
 * modules' use cases call this directly after a critical action succeeds
 * (login, model published, order created, payment status changed, ...).
 *
 * Audit recording failures are logged as application errors but never
 * propagated — a broken audit sink must not take down the primary business
 * operation it's describing.
 */
export async function recordAuditEvent(
  input: Omit<NewAuditLogEntry, "requestId"> & { requestId?: string },
): Promise<void> {
  const entry: NewAuditLogEntry = {
    ...input,
    requestId: input.requestId ?? getRequestId(),
  };
  const timestamp = new Date();

  try {
    await repository.record(entry);
  } catch (error) {
    getLogger().error({ err: error, event: entry.event }, "audit.db_write_failed");
  }

  try {
    writeAuditLogLine({ ...entry, timestamp });
  } catch (error) {
    getLogger().error({ err: error, event: entry.event }, "audit.file_write_failed");
  }
}
