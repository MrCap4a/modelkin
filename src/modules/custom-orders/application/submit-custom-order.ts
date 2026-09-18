import "server-only";
import { getCurrentUser } from "@modules/auth";
import { recordAuditEvent } from "@modules/audit";
import { notifyCustomOrderReceived } from "@modules/notifications";
import {
  customOrderSubmissionSchema,
  type CustomOrderSubmissionInput,
} from "../domain/custom-order-schema";
import { createCustomOrder } from "../infrastructure/prisma-custom-order-repository";

/**
 * Creates a new CustomOrder with status NEW. Works for both guests and
 * logged-in users — CustomOrder.userId is nullable in the schema and ТЗ §26
 * does not gate this form behind login, so we attach the current session's
 * user id when present and leave it null for guests.
 *
 * By the time this runs, any attached files have already been uploaded
 * directly to S3 via @modules/files' presigned-URL flow (browser → S3, ТЗ
 * §20) — this use case only persists the resulting storage keys + metadata
 * as CustomOrderFile rows and records one `file.upload` audit event per
 * file, since @modules/files' `requestUploadUrl` itself only hands out a
 * URL and can't know whether the upload actually happened.
 */
export async function submitCustomOrder(
  input: CustomOrderSubmissionInput,
): Promise<{ id: string }> {
  const parsed = customOrderSubmissionSchema.parse(input);
  const user = await getCurrentUser();

  const customOrder = await createCustomOrder({
    userId: user?.id ?? null,
    name: parsed.name,
    contactType: parsed.contactType,
    contactValue: parsed.contactValue,
    description: parsed.description,
    files: parsed.files,
  });

  await Promise.all(
    customOrder.files.map((file) =>
      recordAuditEvent({
        event: "file.upload",
        actorUserId: user?.id,
        actorRole: user ? "USER" : "GUEST",
        entityType: "CustomOrderFile",
        entityId: file.id,
        metadata: {
          customOrderId: customOrder.id,
          storageKey: file.storageKey,
          originalName: file.originalName,
          size: file.size,
        },
      }),
    ),
  );

  // Best-effort confirmation email — never throws, see notifications module.
  await notifyCustomOrderReceived({
    id: customOrder.id,
    name: customOrder.name,
    contactValue: customOrder.contactValue,
    userEmail: user?.email ?? null,
  });

  return { id: customOrder.id };
}
