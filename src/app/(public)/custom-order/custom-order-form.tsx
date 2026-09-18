"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { clsx } from "@shared/utils/clsx";
import {
  CONTACT_TYPES,
  CONTACT_TYPE_LABELS,
  customOrderSubmissionSchema,
  type CustomOrderAttachmentInput,
  type CustomOrderSubmissionInput,
} from "@modules/custom-orders/domain/custom-order-schema";
import { submitCustomOrderAction } from "@modules/custom-orders/presentation/actions";
import { requestUploadUrlAction } from "@modules/files/presentation/actions";

type ContactType = (typeof CONTACT_TYPES)[number];

const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];
const ACCEPT_ATTR = "image/jpeg,image/png,application/pdf";
const MAX_FILES = 10;

interface Attachment {
  clientId: string;
  file: File;
  status: "uploading" | "done" | "error";
  storageKey?: string;
  error?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function hasAllowedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function makeClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function UploadCloudIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 18a4 4 0 01-.6-7.95A5 5 0 0116.9 8.05 4.5 4.5 0 0117 18H7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 11v7M12 11l-2.5 2.5M12 11l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8.5 12.5l2.3 2.3L15.5 9.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

type FieldErrors = Partial<Record<"description" | "name" | "contactType" | "contactValue" | "files", string>>;

export function CustomOrderForm() {
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [contactType, setContactType] = useState<ContactType>("TELEGRAM");
  const [contactValue, setContactValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File, clientId: string) {
    const uploadResult = await requestUploadUrlAction({
      prefix: "customOrders",
      originalName: file.name,
      contentType: file.type || "application/octet-stream",
      contentLength: file.size,
    });

    if (!uploadResult.ok) {
      setAttachments((prev) =>
        prev.map((a) => (a.clientId === clientId ? { ...a, status: "error", error: uploadResult.error } : a)),
      );
      return;
    }

    try {
      const putResponse = await fetch(uploadResult.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putResponse.ok) {
        throw new Error("upload failed");
      }
      setAttachments((prev) =>
        prev.map((a) =>
          a.clientId === clientId ? { ...a, status: "done", storageKey: uploadResult.data.storageKey } : a,
        ),
      );
    } catch {
      setAttachments((prev) =>
        prev.map((a) =>
          a.clientId === clientId ? { ...a, status: "error", error: "Не удалось загрузить файл" } : a,
        ),
      );
    }
  }

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    const room = MAX_FILES - attachments.length;
    if (room <= 0) {
      setFieldErrors((prev) => ({ ...prev, files: `Не более ${MAX_FILES} файлов` }));
      return;
    }

    const accepted: Attachment[] = [];
    for (const file of incoming.slice(0, room)) {
      if (!hasAllowedExtension(file.name)) {
        setFieldErrors((prev) => ({ ...prev, files: "Поддерживаются JPG, PNG, PDF" }));
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        setFieldErrors((prev) => ({ ...prev, files: "Файл превышает 20 МБ" }));
        continue;
      }
      accepted.push({ clientId: makeClientId(), file, status: "uploading" });
    }

    if (accepted.length === 0) return;

    setFieldErrors((prev) => ({ ...prev, files: undefined }));
    setAttachments((prev) => [...prev, ...accepted]);
    for (const attachment of accepted) {
      void uploadFile(attachment.file, attachment.clientId);
    }
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) {
      addFiles(event.target.files);
    }
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files);
    }
  }

  function removeAttachment(clientId: string) {
    setAttachments((prev) => prev.filter((a) => a.clientId !== clientId));
  }

  function resetForm() {
    setDescription("");
    setName("");
    setContactType("TELEGRAM");
    setContactValue("");
    setAttachments([]);
    setFieldErrors({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (attachments.some((a) => a.status === "uploading")) {
      setFormError("Дождитесь завершения загрузки файлов");
      return;
    }

    const files: CustomOrderAttachmentInput[] = attachments
      .filter((a): a is Attachment & { status: "done"; storageKey: string } => a.status === "done" && !!a.storageKey)
      .map((a) => ({
        storageKey: a.storageKey,
        originalName: a.file.name,
        mimeType: a.file.type || "application/octet-stream",
        size: a.file.size,
      }));

    const candidate: CustomOrderSubmissionInput = {
      description,
      name,
      contactType,
      contactValue,
      files,
    };

    const parsed = customOrderSubmissionSchema.safeParse(candidate);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && key in candidate && !(key in errors)) {
          errors[key as keyof FieldErrors] = issue.message;
        }
      }
      setFieldErrors(errors);
      setFormError("Проверьте правильность заполнения формы");
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await submitCustomOrderAction(parsed.data);
      if (result.ok) {
        setSuccessId(result.id);
        resetForm();
      } else {
        setFormError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const displayRequestNumber = successId ? `#MD-${successId.slice(-4).toUpperCase()}` : null;

  return (
    <div className={clsx("gap-8", successId ? "grid md:grid-cols-[1fr_360px]" : "mx-auto max-w-2xl")}>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-8"
      >
        <h2 className="text-xl font-bold text-ink">Заявка на 3D-моделирование</h2>

        <div className="mt-6">
          <label htmlFor="description" className="block text-sm font-medium text-ink">
            Описание задачи и размеры <span className="text-primary">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Например: нужен кронштейн для полки под углом 45 градусов, ширина паза 20 мм, крепление под 2 винта М4..."
            className="mt-2 w-full rounded-control border border-border bg-background px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {fieldErrors.description && (
            <p className="mt-1.5 text-sm text-danger">{fieldErrors.description}</p>
          )}
        </div>

        <div className="mt-5">
          <label htmlFor="name" className="block text-sm font-medium text-ink">
            Ваше имя <span className="text-primary">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Александр"
            className="mt-2 w-full rounded-control border border-border bg-background px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {fieldErrors.name && <p className="mt-1.5 text-sm text-danger">{fieldErrors.name}</p>}
        </div>

        <div className="mt-5">
          <span className="block text-sm font-medium text-ink">
            Где вам удобнее ответить? <span className="text-primary">*</span>
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {CONTACT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setContactType(type)}
                className={clsx(
                  "rounded-control px-4 py-2 text-sm font-medium transition-colors",
                  contactType === type
                    ? "bg-primary text-white"
                    : "border border-border bg-surface-alt text-ink hover:border-primary",
                )}
              >
                {CONTACT_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          {fieldErrors.contactType && (
            <p className="mt-1.5 text-sm text-danger">{fieldErrors.contactType}</p>
          )}
        </div>

        <div className="mt-5">
          <label htmlFor="contactValue" className="block text-sm font-medium text-ink">
            Контактные данные <span className="text-primary">*</span>
          </label>
          <input
            id="contactValue"
            type="text"
            value={contactValue}
            onChange={(e) => setContactValue(e.target.value)}
            placeholder={contactType === "PHONE" ? "+7 999 123-45-67" : "@alex_print3d"}
            className="mt-2 w-full rounded-control border border-border bg-background px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {fieldErrors.contactValue && (
            <p className="mt-1.5 text-sm text-danger">{fieldErrors.contactValue}</p>
          )}
        </div>

        <div className="mt-5">
          <span className="block text-sm font-medium text-ink">Эскизы, фото или чертежи</span>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              "mt-2 flex cursor-pointer flex-col items-center justify-center rounded-control border-2 border-dashed px-4 py-8 text-center transition-colors",
              dragActive ? "border-primary bg-primary-subtle" : "border-border bg-surface-alt",
            )}
          >
            <span className="text-primary">
              <UploadCloudIcon />
            </span>
            <p className="mt-2 text-sm font-medium text-ink">Перетащите файлы сюда</p>
            <p className="mt-1 text-xs text-ink-muted">Поддерживаются JPG, PNG, PDF до 20 МБ</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
          {fieldErrors.files && <p className="mt-1.5 text-sm text-danger">{fieldErrors.files}</p>}

          {attachments.length > 0 && (
            <ul className="mt-3 space-y-2">
              {attachments.map((attachment) => (
                <li
                  key={attachment.clientId}
                  className="flex items-center justify-between gap-3 rounded-control border border-border bg-background px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{attachment.file.name}</p>
                    <p className="text-xs text-ink-muted">
                      {formatFileSize(attachment.file.size)}
                      {attachment.status === "error" && attachment.error ? ` · ${attachment.error}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {attachment.status === "uploading" && (
                      <span className="text-ink-muted" aria-label="Загрузка">
                        <SpinnerIcon />
                      </span>
                    )}
                    {attachment.status === "done" && (
                      <span className="text-success" aria-label="Загружено">
                        <CheckCircleIcon />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.clientId)}
                      aria-label="Удалить файл"
                      className="text-ink-muted transition-colors hover:text-danger"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {formError && (
          <p className="mt-5 rounded-control bg-danger-bg px-3.5 py-2.5 text-sm text-danger">{formError}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Отправка..." : "Отправить заявку"}
        </button>
      </form>

      {successId && displayRequestNumber && (
        <div className="h-fit rounded-card border border-success bg-success-bg p-6">
          <span className="text-success">
            <CheckCircleIcon />
          </span>
          <h3 className="mt-3 text-lg font-bold text-ink">Заявка успешно отправлена!</h3>
          <p className="mt-2 text-sm text-ink-muted">
            Мы получили ваши требования и свяжемся с вами как можно скорее, чтобы уточнить детали и
            стоимость моделирования.
          </p>
          <div className="mt-4 border-t border-success/30 pt-4 text-xs font-medium tracking-wide text-ink-muted">
            НОМЕР ЗАЯВКИ: {displayRequestNumber}
          </div>
        </div>
      )}
    </div>
  );
}
