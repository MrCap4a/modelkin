import { getConfig } from "@shared/config";
import { DailyRotatingWriter } from "@shared/logging";
import type { NewAuditLogEntry } from "../domain/audit-log-entry";

let writer: DailyRotatingWriter | undefined;

function getWriter(): DailyRotatingWriter {
  if (!writer) {
    writer = new DailyRotatingWriter(getConfig().logging.dir, "audit");
  }
  return writer;
}

/**
 * Writes the audit event as a structured JSON line to `logs/YYYY-MM-DD/audit.log`
 * (ТЗ §33), independently of the DB copy written by PrismaAuditLogRepository.
 */
export function writeAuditLogLine(entry: NewAuditLogEntry & { timestamp: Date }): void {
  const line =
    JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: "info",
      event: entry.event,
      requestId: entry.requestId,
      actorUserId: entry.actorUserId,
      actorRole: entry.actorRole,
      entityType: entry.entityType,
      entityId: entry.entityId,
      ip: entry.ip,
      metadata: entry.metadata,
    }) + "\n";

  getWriter().write(line);
}
