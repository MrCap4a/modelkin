import "server-only";
import type { CustomOrderDetail } from "../domain/custom-order";
import { getCustomOrderByIdRepo } from "../infrastructure/prisma-custom-order-repository";

/**
 * For the admin /admin/custom-orders/[id] detail screen. Authorization is
 * the caller's responsibility.
 *
 * Deliberately returns only the current status, not a full change-history
 * timeline: prisma/schema.prisma has no dedicated CustomOrderStatusHistory
 * table, and building a timeline view out of @modules/audit's AuditLog
 * entries (entityType "CustomOrder", entityId id) was judged unnecessary
 * scope for this slice — a simple current-status view is an honest,
 * intentionally simple reading of the PDF's admin detail mockup. The admin
 * agent can layer `listAuditLogs({ entityType: "CustomOrder", entityId })`
 * on top of this later if a timeline turns out to be worth it.
 */
export async function getCustomOrderDetail(id: string): Promise<CustomOrderDetail | null> {
  return getCustomOrderByIdRepo(id);
}
