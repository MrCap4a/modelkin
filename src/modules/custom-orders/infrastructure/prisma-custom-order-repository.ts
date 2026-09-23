import "server-only";
import { prisma } from "@infrastructure/database";
import type {
  ContactType,
  CustomOrderDetail,
  CustomOrderFileAttachment,
  CustomOrderStatus,
  CustomOrderSummary,
} from "../domain/custom-order";
import type { CustomOrderAttachmentInput } from "../domain/custom-order-schema";

interface CustomOrderRow {
  id: string;
  userId: string | null;
  name: string;
  contactType: string;
  contactValue: string;
  description: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomOrderFileRow {
  id: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

function toFileAttachment(row: CustomOrderFileRow): CustomOrderFileAttachment {
  return {
    id: row.id,
    storageKey: row.storageKey,
    originalName: row.originalName,
    mimeType: row.mimeType,
    size: row.size,
    createdAt: row.createdAt,
  };
}

function toDetail(row: CustomOrderRow, files: CustomOrderFileRow[]): CustomOrderDetail {
  return {
    ...toSummary(row, files.length),
    files: files.map(toFileAttachment),
  };
}

function toSummary(row: CustomOrderRow, fileCount: number): CustomOrderSummary {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    contactType: row.contactType as ContactType,
    contactValue: row.contactValue,
    status: row.status as CustomOrderStatus,
    description: row.description,
    fileCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface NewCustomOrderInput {
  userId: string | null;
  name: string;
  contactType: ContactType;
  contactValue: string;
  description: string;
  files: CustomOrderAttachmentInput[];
}

export async function createCustomOrder(input: NewCustomOrderInput): Promise<CustomOrderDetail> {
  const row = await prisma.customOrder.create({
    data: {
      userId: input.userId,
      name: input.name,
      contactType: input.contactType,
      contactValue: input.contactValue,
      description: input.description,
      files: {
        create: input.files.map((file) => ({
          storageKey: file.storageKey,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
        })),
      },
    },
    include: { files: true },
  });

  return toDetail(row, row.files);
}

export async function listCustomOrdersRepo(filter?: {
  status?: CustomOrderStatus;
}): Promise<CustomOrderSummary[]> {
  const rows = await prisma.customOrder.findMany({
    where: filter?.status ? { status: filter.status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { files: true } } },
  });

  return rows.map((row) => toSummary(row, row._count.files));
}

export async function getCustomOrderByIdRepo(id: string): Promise<CustomOrderDetail | null> {
  const row = await prisma.customOrder.findUnique({
    where: { id },
    include: { files: true },
  });
  if (!row) return null;
  return toDetail(row, row.files);
}

export async function updateCustomOrderStatusRepo(
  id: string,
  status: CustomOrderStatus,
): Promise<CustomOrderDetail> {
  const row = await prisma.customOrder.update({
    where: { id },
    data: { status },
    include: { files: true },
  });
  return toDetail(row, row.files);
}
