import { z } from "zod";

/** `storageKey` comes from `@modules/files`' presigned-upload response, not user input directly. */
export const updateAvatarSchema = z.object({
  storageKey: z.string().min(1, "Не удалось определить загруженный файл"),
});

export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
