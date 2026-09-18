import { z } from "zod";

// Pure Zod schema — no server-only / Next.js imports — so it is safe to
// import from both the submit-custom-order use case AND the client-side
// custom-order form for instant validation feedback (ТЗ §63: reusable
// schemas so frontend/backend never accidentally diverge).

export const CONTACT_TYPES = ["TELEGRAM", "MAX", "PHONE"] as const;

export const CONTACT_TYPE_LABELS: Record<(typeof CONTACT_TYPES)[number], string> = {
  TELEGRAM: "Telegram",
  MAX: "MAX",
  PHONE: "Телефон",
};

/** Loose on purpose: accepts common phone formats (+7 999 123-45-67, 89991234567, ...). */
const PHONE_LIKE_REGEX = /^[+]?[\d\s().-]{5,25}$/;

export const customOrderAttachmentSchema = z.object({
  storageKey: z.string().min(1),
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
});

export type CustomOrderAttachmentInput = z.infer<typeof customOrderAttachmentSchema>;

export const customOrderSubmissionSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(1, "Опишите задачу и размеры")
      .max(4000, "Описание слишком длинное (максимум 4000 символов)"),
    name: z.string().trim().min(1, "Введите ваше имя").max(150, "Слишком длинное имя"),
    contactType: z.enum(CONTACT_TYPES, {
      errorMap: () => ({ message: "Выберите способ связи" }),
    }),
    contactValue: z
      .string()
      .trim()
      .min(1, "Укажите контактные данные")
      .max(255, "Слишком длинное значение"),
    files: z.array(customOrderAttachmentSchema).max(10, "Не более 10 файлов").default([]),
  })
  .superRefine((value, ctx) => {
    if (value.contactType === "PHONE" && !PHONE_LIKE_REGEX.test(value.contactValue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contactValue"],
        message: "Введите корректный номер телефона",
      });
    }
  });

export type CustomOrderSubmissionInput = z.infer<typeof customOrderSubmissionSchema>;
