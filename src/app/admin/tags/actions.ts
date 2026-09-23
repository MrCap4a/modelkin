"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@modules/auth";
import {
  createTag,
  renameTag,
  deleteTag,
  updateTagSeo,
  tagInputSchema,
  tagSeoInputSchema,
  type TagSummary,
  type TagSeoDetail,
} from "@modules/tags";
import { toSafeError } from "@shared/errors";
import { fieldErrorsFrom, type ActionResult } from "../_lib/action-result";

export async function createTagAction(input: unknown): Promise<ActionResult<TagSummary>> {
  try {
    const admin = await requireAdmin();
    const parsed = tagInputSchema.parse(input);
    const tag = await createTag(parsed, admin.id);
    revalidatePath("/admin/tags");
    revalidatePath("/admin/models");
    revalidatePath("/models");
    return { ok: true, data: tag };
  } catch (error) {
    const { body } = toSafeError(error);
    return {
      ok: false,
      error: body.error.message,
      fieldErrors: fieldErrorsFrom(body.error.details),
    };
  }
}

export async function renameTagAction(
  id: string,
  input: unknown,
): Promise<ActionResult<TagSummary>> {
  try {
    const admin = await requireAdmin();
    const parsed = tagInputSchema.parse(input);
    const tag = await renameTag(id, parsed, admin.id);
    revalidatePath("/admin/tags");
    revalidatePath("/admin/models");
    revalidatePath("/models");
    return { ok: true, data: tag };
  } catch (error) {
    const { body } = toSafeError(error);
    return {
      ok: false,
      error: body.error.message,
      fieldErrors: fieldErrorsFrom(body.error.details),
    };
  }
}

export async function updateTagSeoAction(
  id: string,
  input: unknown,
): Promise<ActionResult<TagSeoDetail>> {
  try {
    const admin = await requireAdmin();
    const parsed = tagSeoInputSchema.parse(input);
    const tag = await updateTagSeo(id, parsed, admin.id);
    revalidatePath("/admin/tags");
    revalidatePath(`/tag/${tag.slug}`);
    revalidatePath("/sitemap.xml");
    return { ok: true, data: tag };
  } catch (error) {
    const { body } = toSafeError(error);
    return {
      ok: false,
      error: body.error.message,
      fieldErrors: fieldErrorsFrom(body.error.details),
    };
  }
}

export async function deleteTagAction(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await deleteTag(id, admin.id);
    revalidatePath("/admin/tags");
    revalidatePath("/admin/models");
    revalidatePath("/models");
    return { ok: true, data: undefined };
  } catch (error) {
    const { body } = toSafeError(error);
    return {
      ok: false,
      error: body.error.message,
      fieldErrors: fieldErrorsFrom(body.error.details),
    };
  }
}
