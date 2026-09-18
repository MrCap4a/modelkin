"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@modules/auth";
import {
  addModelFile,
  addModelImage,
  createModel,
  hideModel,
  modelAdminInputSchema,
  modelAdminUpdateSchema,
  publishModel,
  updateModel,
  type ModelAdminDetail,
} from "@modules/models";
import { toSafeError } from "@shared/errors";
import { fieldErrorsFrom, type ActionResult } from "../_lib/action-result";

export async function createModelAction(input: unknown): Promise<ActionResult<ModelAdminDetail>> {
  try {
    const admin = await requireAdmin();
    const parsed = modelAdminInputSchema.parse(input);
    const model = await createModel(
      {
        title: parsed.title,
        description: parsed.description,
        price: parsed.price,
        tagSlugs: parsed.tagSlugs,
        authorEmail: parsed.authorEmail || undefined,
      },
      admin.id,
    );
    revalidatePath("/admin/models");
    return { ok: true, data: model };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message, fieldErrors: fieldErrorsFrom(body.error.details) };
  }
}

export async function updateModelAction(
  modelId: string,
  input: unknown,
): Promise<ActionResult<ModelAdminDetail>> {
  try {
    const admin = await requireAdmin();
    const parsed = modelAdminUpdateSchema.parse(input);
    const model = await updateModel(
      modelId,
      {
        ...(parsed.title !== undefined ? { title: parsed.title } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        ...(parsed.price !== undefined ? { price: parsed.price } : {}),
        ...(parsed.tagSlugs !== undefined ? { tagSlugs: parsed.tagSlugs } : {}),
        ...(parsed.authorEmail !== undefined ? { authorEmail: parsed.authorEmail } : {}),
      },
      admin.id,
    );
    revalidatePath("/admin/models");
    revalidatePath(`/admin/models/${modelId}`);
    return { ok: true, data: model };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message, fieldErrors: fieldErrorsFrom(body.error.details) };
  }
}

export async function publishModelAction(modelId: string): Promise<ActionResult<ModelAdminDetail>> {
  try {
    const admin = await requireAdmin();
    const model = await publishModel(modelId, admin.id);
    revalidatePath("/admin/models");
    revalidatePath(`/admin/models/${modelId}`);
    return { ok: true, data: model };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message, fieldErrors: fieldErrorsFrom(body.error.details) };
  }
}

export async function hideModelAction(modelId: string): Promise<ActionResult<ModelAdminDetail>> {
  try {
    const admin = await requireAdmin();
    const model = await hideModel(modelId, admin.id);
    revalidatePath("/admin/models");
    revalidatePath(`/admin/models/${modelId}`);
    return { ok: true, data: model };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message, fieldErrors: fieldErrorsFrom(body.error.details) };
  }
}

export async function addModelImageAction(
  modelId: string,
  storageKey: string,
): Promise<ActionResult<{ id: string; url: string }>> {
  try {
    const admin = await requireAdmin();
    const result = await addModelImage(modelId, storageKey, admin.id);
    revalidatePath(`/admin/models/${modelId}`);
    return { ok: true, data: result };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message, fieldErrors: fieldErrorsFrom(body.error.details) };
  }
}

export async function addModelFileAction(
  modelId: string,
  storageKey: string,
  originalName: string,
  mimeType: string,
  size: number,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireAdmin();
    const result = await addModelFile(modelId, storageKey, originalName, mimeType, size, admin.id);
    revalidatePath(`/admin/models/${modelId}`);
    return { ok: true, data: result };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message, fieldErrors: fieldErrorsFrom(body.error.details) };
  }
}
