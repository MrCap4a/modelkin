// Pure domain types — no server-only / Next.js / Prisma imports, mirrors
// prisma/schema.prisma's ContactType / CustomOrderStatus enums (ТЗ §26).

export type ContactType = "TELEGRAM" | "MAX" | "PHONE";

export type CustomOrderStatus =
  "NEW" | "IN_PROGRESS" | "WAITING_FOR_REPLY" | "COMPLETED" | "CANCELLED";

export const CUSTOM_ORDER_STATUSES: readonly CustomOrderStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "WAITING_FOR_REPLY",
  "COMPLETED",
  "CANCELLED",
];

export interface CustomOrderFileAttachment {
  id: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

/** Row shape for the admin list screen — no files payload (see CustomOrderDetail for that). */
export interface CustomOrderSummary {
  id: string;
  userId: string | null;
  name: string;
  contactType: ContactType;
  contactValue: string;
  status: CustomOrderStatus;
  description: string;
  fileCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Full row shape for the admin detail screen. */
export interface CustomOrderDetail extends CustomOrderSummary {
  files: CustomOrderFileAttachment[];
}
