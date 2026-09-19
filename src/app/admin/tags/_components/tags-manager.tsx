"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
// Concrete file, not the `@modules/tags` barrel — that barrel also
// re-exports server-only use cases, which breaks in a Client Component.
import { tagInputSchema } from "@modules/tags/domain/tag-schema";
import type { TagAdminSummary } from "@modules/tags";
import { createTagAction, deleteTagAction, renameTagAction } from "../actions";

function TagRow({ tag }: { tag: TagAdminSummary }) {
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
                <TagRow key={tag.id} tag={tag} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
