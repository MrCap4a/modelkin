// Public contract of the users module. Other modules and `app/**` should
// only ever import from here.

export { updateProfile } from "./application/update-profile";
export { updateAvatar } from "./application/update-avatar";
export { getUserProfile } from "./application/get-user-profile";
export { updateProfileSchema, type UpdateProfileInput } from "./domain/update-profile.schema";
export { updateAvatarSchema, type UpdateAvatarInput } from "./domain/update-avatar.schema";
export type { UserProfileRecord } from "./infrastructure/prisma-user-profile-repository";
