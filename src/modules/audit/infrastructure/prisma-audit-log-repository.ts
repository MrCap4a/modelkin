import type { Prisma } from "@prisma/client";
import { prisma } from "@infrastructure/database";
import type {
  AuditLogEntry,
  AuditLogFilter,
  AuditLogPage,
  NewAuditLogEntry,
  AuditEventName,
} from "../domain/audit-log-entry";
import type { AuditLogRepository } from "../domain/audit-log-repository";

const DEFAULT_PAGE_SIZE = 50;

function toEntry(row: {
  id: string;
  timestamp: Date;
  actorUserId: string | null;
  actorRole: string | null;
  event: string;
  entityType: string | null;
  entityId: string | null;
  requestId: string | null;
  metadata: unknown;
  ip: string | null;
}): AuditLogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    actorUserId: row.actorUserId ?? undefined,
    actorRole: row.actorRole ?? undefined,
    event: row.event as AuditEventName,
    entityType: row.entityType ?? undefined,
    entityId: row.entityId ?? undefined,
    requestId: row.requestId ?? undefined,
    metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
    ip: row.ip ?? undefined,
  };
}

export class PrismaAuditLogRepository implements AuditLogRepository {
  async record(entry: NewAuditLogEntry): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        actorRole: entry.actorRole,
        event: entry.event,
        entityType: entry.entityType,
        entityId: entry.entityId,
        requestId: entry.requestId,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
        ip: entry.ip,
      },
    });
  }

  async list(filter: AuditLogFilter): Promise<AuditLogPage> {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const pageSize = filter.pageSize && filter.pageSize > 0 ? filter.pageSize : DEFAULT_PAGE_SIZE;

    const where = {
      ...(filter.event ? { event: filter.event } : {}),
      ...(filter.actorUserId ? { actorUserId: filter.actorUserId } : {}),
      ...(filter.entityType ? { entityType: filter.entityType } : {}),
      ...(filter.entityId ? { entityId: filter.entityId } : {}),
      ...(filter.from || filter.to
        ? {
            timestamp: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lte: filter.to } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items: rows.map(toEntry), total, page, pageSize };
  }
}
