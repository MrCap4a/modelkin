"use server";

import { requireUser, changePassword, getClientIp } from "@modules/auth";
import type { ChangePasswordInput } from "@modules/auth/domain/change-password.schema";
import type { UpdateProfileInput } from "@modules/users/domain/update-profile.schema";
import type { UpdateAvatarInput } from "@modules/users/domain/update-avatar.schema";
import { updateProfile, updateAvatar } from "@modules/users";
import { toSafeError } from "@shared/errors";
import { fieldErrorsFrom, type ActionResult } from "./_components/action-result";

export async function updateProfileAction(input: UpdateProfileInput): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updateProfile(user, input);
    return { ok: true, data: undefined };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message, fieldErrors: fieldErrorsFrom(body.error.details) };
  }
}

export async function updateAvatarAction(input: UpdateAvatarInput): Promise<ActionResult<string>> {
  try {
    const user = await requireUser();
    const avatarUrl = await updateAvatar(user, input);
    return { ok: true, data: avatarUrl };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message, fieldErrors: fieldErrorsFrom(body.error.details) };
  }
}

export async function changePasswordAction(input: ChangePasswordInput): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const ip = await getClientIp();
    await changePassword(user, input, { ip });
    return { ok: true, data: undefined };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message, fieldErrors: fieldErrorsFrom(body.error.details) };
  }
}
