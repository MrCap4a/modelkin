"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
// Concrete file, not the `@modules/tags` barrel — that barrel also
// re-exports server-only use cases, which breaks in a Client Component.
import { tagInputSchema, tagSeoInputSchema } from "@modules/tags/domain/tag-schema";
import type { TagAdminSummary } from "@modules/tags";
import { clsx } from "@shared/utils/clsx";
import { createTagAction, deleteTagAction, renameTagAction, updateTagSeoAction } from "../actions";

/**
 * Expandable per-tag panel (SEO audit, 2026-09-21) — opts a tag into its
 * own indexable /tag/{slug} page. Off by default for every tag (see
 * ARCHITECTURE.md): most tags exist purely for filtering and should never
 * become a separate indexable page.
 */
function TagSeoPanel({ tag, onClose }: { tag: TagAdminSummary; onClose: () => void }) {
  const router = useRouter();
  const [seoIndexed, setSeoIndexed] = useState(tag.seoIndexed);
  const [seoTitle, setSeoTitle] = useState(tag.seoTitle ?? "");
  const [seoH1, setSeoH1] = useState(tag.seoH1 ?? "");
  const [seoDescription, setSeoDescription] = useState(tag.seoDescription ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const parsed = tagSeoInputSchema.safeParse({ seoIndexed, seoTitle, seoH1, seoDescription });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Проверьте поля");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateTagSeoAction(tag.id, parsed.data);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <tr className="border-t border-border bg-surface-alt/60">
      <td colSpan={4} className="px-6 py-4">
        <div className="max-w-xl space-y-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={seoIndexed}
              onChange={(e) => setSeoIndexed(e.target.checked)}
            />
            Сделать отдельной индексируемой страницей — /tag/{tag.slug}
          </label>

          <div>
            <label className="block text-xs font-medium text-ink-muted">
              SEO title (пусто — автоматически)
            </label>
            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder={`${tag.name} — STL модели | Моделкин`}
              className="mt-1 w-full rounded-control border border-border bg-background px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted">
              H1 на странице (пусто — название категории)
            </label>
            <input
              value={seoH1}
              onChange={(e) => setSeoH1(e.target.value)}
              placeholder={tag.name}
              className="mt-1 w-full rounded-control border border-border bg-background px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted">
              SEO-описание (meta description и вступительный текст на странице)
            </label>
            <textarea
              rows={3}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className="mt-1 w-full rounded-control border border-border bg-background px-3 py-1.5 text-sm text-ink focus:border-primary focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={handleSave}
              className="rounded-control bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              Сохранить SEO
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-control border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-alt"
            >
              Закрыть
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function TagRow({
  tag,
  seoOpen,
  onToggleSeo,
}: {
  tag: TagAdminSummary;
  seoOpen: boolean;
  onToggleSeo: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRename() {
    const parsed = tagInputSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Некорректное название");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await renameTagAction(tag.id, parsed.data);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      tag.modelCount > 0
        ? `Удалить категорию «${tag.name}»? Она используется в ${tag.modelCount} модел${tag.modelCount === 1 ? "и" : "ях"} — они не будут удалены, но потеряют эту категорию.`
        : `Удалить категорию «${tag.name}»?`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const res = await deleteTagAction(tag.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <tr className="border-t border-border">
        <td className="px-6 py-3">
          {editing ? (
            <div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="w-full max-w-xs rounded-control border border-border bg-background px-3 py-1.5 text-sm text-ink focus:border-primary focus:outline-none"
              />
              {error && <p className="mt-1 text-xs text-danger">{error}</p>}
            </div>
          ) : (
            <span className="font-medium text-ink">{tag.name}</span>
          )}
        </td>
        <td className="px-6 py-3 text-ink-muted">{tag.slug}</td>
        <td className="px-6 py-3 text-right text-ink-muted">{tag.modelCount} шт.</td>
        <td className="px-6 py-3 text-right">
          {editing ? (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={handleRename}
                className="rounded-control bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                Сохранить
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(tag.name);
                  setError(null);
                }}
                className="rounded-control border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-alt"
              >
                Отмена
              </button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onToggleSeo}
                className={clsx(
                  "rounded-control border px-3 py-1.5 text-xs font-medium hover:bg-surface-alt",
                  tag.seoIndexed
                    ? "border-primary/40 text-primary"
                    : "border-border text-ink-muted",
                )}
              >
                {tag.seoIndexed ? "SEO: включено" : "SEO"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-control border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-alt"
              >
                Переименовать
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={handleDelete}
                className="rounded-control border border-border px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-bg disabled:opacity-60"
              >
                Удалить
              </button>
            </div>
          )}
        </td>
      </tr>
      {seoOpen && <TagSeoPanel tag={tag} onClose={onToggleSeo} />}
    </>
  );
}

function CreateTagForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = tagInputSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Некорректное название");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createTagAction(parsed.data);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setName("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-start gap-3">
      <div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название новой категории"
          className="w-64 rounded-control border border-border bg-background px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none"
        />
        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Добавление…" : "+ Добавить категорию"}
      </button>
    </form>
  );
}

export function TagsManager({ tags }: { tags: TagAdminSummary[] }) {
  const [seoOpenId, setSeoOpenId] = useState<string | null>(null);

  return (
    <div>
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <CreateTagForm />
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-border bg-surface">
        {tags.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">Категорий пока нет.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-6 py-3 font-semibold">Название</th>
                <th className="px-6 py-3 font-semibold">Slug</th>
                <th className="px-6 py-3 text-right font-semibold">Моделей</th>
                <th className="px-6 py-3 text-right font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  seoOpen={seoOpenId === tag.id}
                  onToggleSeo={() =>
                    setSeoOpenId((current) => (current === tag.id ? null : tag.id))
                  }
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
