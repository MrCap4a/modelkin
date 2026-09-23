"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { TagSummary } from "@modules/tags";
import { modelAdminInputSchema } from "@modules/models/domain/model-admin-schema";
import { clsx } from "@shared/utils/clsx";
import {
  addModelFileAction,
  addModelImageAction,
  createModelAction,
  publishModelAction,
  updateModelAction,
} from "../actions";
import { PreviewImageUploader } from "./preview-image-uploader";
import { StlFileUploader, type StagedStlFile } from "./stl-file-uploader";

export interface ModelFormInitialData {
  id: string;
  title: string;
  description: string;
  /** Kopecks. */
  price: number;
  tagSlugs: string[];
  authorEmail: string;
  imageUrl: string | null;
  file: { originalName: string; size: number } | null;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN";
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
}

type FieldErrors = Partial<
  Record<
    "title" | "description" | "price" | "tagSlugs" | "authorEmail" | "seoTitle" | "seoDescription",
    string
  >
>;

function kopecksToRublesInput(kopecks: number): string {
  return (kopecks / 100).toString();
}

function rublesInputToKopecks(value: string): number {
  const normalized = value.replace(",", ".").trim();
  const rubles = Number.parseFloat(normalized);
  if (!Number.isFinite(rubles)) return NaN;
  return Math.round(rubles * 100);
}

/**
 * Single form used by both /admin/models/new and /admin/models/[id]. The
 * PDF ("Добавить 3D-модель") shows a single-select category dropdown and a
 * free-text tags input; our data model has models carrying MULTIPLE Tag
 * rows, so this deliberately renders a multi-select tag picker instead of
 * free text — correctness over pixel fidelity here. Categories themselves
 * are admin-managed (@modules/tags, see /admin/tags) rather than a fixed
 * hardcoded set — `availableTags` is fetched server-side by the page.
 */
export function ModelForm({
  initial,
  availableTags,
}: {
  initial: ModelFormInitialData | null;
  availableTags: TagSummary[];
}) {
  const router = useRouter();
  const isEdit = initial !== null;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceInput, setPriceInput] = useState(initial ? kopecksToRublesInput(initial.price) : "");
  const [tagSlugs, setTagSlugs] = useState<string[]>(initial?.tagSlugs ?? []);
  const [authorEmail, setAuthorEmail] = useState(initial?.authorEmail ?? "");
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription ?? "");
  const [noindex, setNoindex] = useState(initial?.noindex ?? false);

  const [stagedImageStorageKey, setStagedImageStorageKey] = useState<string | null>(null);
  const [stagedFile, setStagedFile] = useState<StagedStlFile | null>(null);
  const [imageUrl] = useState(initial?.imageUrl ?? null);
  const [fileMeta] = useState(initial?.file ?? null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"draft" | "publish" | null>(null);

  function toggleTag(slug: string) {
    setTagSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  async function attachStagedUploads(modelId: string) {
    // Only relevant right after createModel — in edit mode uploads are
    // already persisted immediately by the uploader components themselves.
    if (stagedImageStorageKey) {
      await addModelImageAction(modelId, stagedImageStorageKey);
    }
    if (stagedFile) {
      await addModelFileAction(
        modelId,
        stagedFile.storageKey,
        stagedFile.originalName,
        stagedFile.mimeType,
        stagedFile.size,
      );
    }
  }

  async function handleSave(action: "draft" | "publish") {
    setFormError(null);

    const price = rublesInputToKopecks(priceInput);
    const candidate = {
      title,
      description,
      price,
      tagSlugs,
      authorEmail: authorEmail.trim() || undefined,
      seoTitle,
      seoDescription,
      noindex,
    };

    const parsed = modelAdminInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !(key in errors)) {
          errors[key as keyof FieldErrors] = issue.message;
        }
      }
      setFieldErrors(errors);
      setFormError("Проверьте правильность заполнения формы");
      return;
    }

    setFieldErrors({});
    setPendingAction(action);

    try {
      if (isEdit) {
        const result = await updateModelAction(initial.id, parsed.data);
        if (!result.ok) {
          setFormError(result.error);
          setFieldErrors(result.fieldErrors as FieldErrors);
          return;
        }
        if (action === "publish") {
          const publishResult = await publishModelAction(initial.id);
          if (!publishResult.ok) {
            setFormError(publishResult.error);
            return;
          }
        }
        router.push("/admin/models");
        router.refresh();
      } else {
        const result = await createModelAction(parsed.data);
        if (!result.ok) {
          setFormError(result.error);
          setFieldErrors(result.fieldErrors as FieldErrors);
          return;
        }
        await attachStagedUploads(result.data.id);
        if (action === "publish") {
          const publishResult = await publishModelAction(result.data.id);
          if (!publishResult.ok) {
            setFormError(publishResult.error);
            router.push(`/admin/models/${result.data.id}`);
            return;
          }
        }
        router.push("/admin/models");
      }
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <h2 className="text-sm font-bold text-ink">Основная информация</h2>

        <div className="mt-4">
          <label htmlFor="title" className="block text-sm font-medium text-ink">
            Название модели <span className="text-primary">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Кронштейн для наушников под стол"
            className="mt-2 w-full rounded-control border border-border bg-background px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {fieldErrors.title && <p className="mt-1.5 text-sm text-danger">{fieldErrors.title}</p>}
        </div>

        <div className="mt-4">
          <label htmlFor="description" className="block text-sm font-medium text-ink">
            Описание параметров и инструкции печати <span className="text-primary">*</span>
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Удобное крепление. Печать без поддержек. Направление укладки слоёв горизонтальное для повышенной прочности…"
            className="mt-2 w-full rounded-control border border-border bg-background px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {fieldErrors.description && (
            <p className="mt-1.5 text-sm text-danger">{fieldErrors.description}</p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <span className="block text-sm font-medium text-ink">Категория</span>
              <Link href="/admin/tags" className="text-xs font-medium text-primary hover:underline">
                Управлять категориями
              </Link>
            </div>
            {availableTags.length === 0 ? (
              <p className="mt-2 text-xs text-ink-muted">
                Категорий пока нет — создайте их на странице{" "}
                <Link href="/admin/tags" className="text-primary hover:underline">
                  «Категории»
                </Link>
                .
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag.slug}
                    type="button"
                    onClick={() => toggleTag(tag.slug)}
                    className={clsx(
                      "rounded-control px-3 py-1.5 text-xs font-medium transition-colors",
                      tagSlugs.includes(tag.slug)
                        ? "bg-primary text-white"
                        : "border border-border bg-surface-alt text-ink hover:border-primary",
                    )}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
            {fieldErrors.tagSlugs && (
              <p className="mt-1.5 text-sm text-danger">{fieldErrors.tagSlugs}</p>
            )}
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-ink">
              Цена (руб) <span className="text-primary">*</span>
            </label>
            <input
              id="price"
              type="text"
              inputMode="decimal"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="290"
              className="mt-2 w-full rounded-control border border-border bg-background px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {fieldErrors.price && <p className="mt-1.5 text-sm text-danger">{fieldErrors.price}</p>}
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="authorEmail" className="block text-sm font-medium text-ink">
            Автор (email)
          </label>
          <input
            id="authorEmail"
            type="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            placeholder="author@example.com"
            className="mt-2 w-full rounded-control border border-border bg-background px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1.5 text-xs text-ink-muted">
            Должен быть email уже зарегистрированного пользователя — он получит долю с продаж этой
            модели.
          </p>
          {fieldErrors.authorEmail && (
            <p className="mt-1.5 text-sm text-danger">{fieldErrors.authorEmail}</p>
          )}
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-6 shadow-card lg:col-span-2">
        <h2 className="text-sm font-bold text-ink">SEO (необязательно)</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Оставьте пустым — заголовок и описание для поисковиков сформируются автоматически из
          названия и описания модели.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="seoTitle" className="block text-sm font-medium text-ink">
              SEO title
            </label>
            <input
              id="seoTitle"
              type="text"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder={`${title || "Название модели"} — STL-модель для 3D-печати | Моделкин`}
              className="mt-2 w-full rounded-control border border-border bg-background px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {fieldErrors.seoTitle && (
              <p className="mt-1.5 text-sm text-danger">{fieldErrors.seoTitle}</p>
            )}
          </div>

          <div>
            <label htmlFor="seoDescription" className="block text-sm font-medium text-ink">
              SEO description
            </label>
            <input
              id="seoDescription"
              type="text"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Автоматически из описания модели"
              className="mt-2 w-full rounded-control border border-border bg-background px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {fieldErrors.seoDescription && (
              <p className="mt-1.5 text-sm text-danger">{fieldErrors.seoDescription}</p>
            )}
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={noindex} onChange={(e) => setNoindex(e.target.checked)} />
          Не индексировать эту модель (noindex) — страница останется доступной по ссылке, но не
          будет предлагаться в поиске
        </label>
      </div>

      <div className="flex flex-col gap-6">
        <PreviewImageUploader
          modelId={isEdit ? initial.id : null}
          initialUrl={imageUrl}
          onUploaded={setStagedImageStorageKey}
        />
        <StlFileUploader
          modelId={isEdit ? initial.id : null}
          initialFile={fileMeta}
          onUploaded={setStagedFile}
        />

        {formError && (
          <p className="rounded-control bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
            {formError}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={pendingAction !== null}
            onClick={() => handleSave("draft")}
            className="flex-1 rounded-control border border-border bg-surface px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingAction === "draft" ? "Сохранение…" : "Черновик"}
          </button>
          <button
            type="button"
            disabled={pendingAction !== null}
            onClick={() => handleSave("publish")}
            className="flex-1 rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingAction === "publish" ? "Публикация…" : "Опубликовать"}
          </button>
        </div>
      </div>
    </div>
  );
}
