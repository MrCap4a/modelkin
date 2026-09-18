"use client";

import { useRef, useState } from "react";
import { requestUploadUrlAction } from "@modules/files/presentation/actions";
import { addModelImageAction } from "../actions";

/**
 * Handles both admin flows:
 * - edit (`modelId` set): upload to S3, then immediately persist the
 *   ModelImage row (replace semantics — mirrors profile/_components/
 *   avatar-uploader.tsx).
 * - create (`modelId` null, model not saved yet): upload to S3 only, hand
 *   the resulting storageKey up via `onUploaded` so the parent form can
 *   attach it to the model once createModel returns an id.
 */
export function PreviewImageUploader({
  modelId,
  initialUrl,
  onUploaded,
}: {
  modelId: string | null;
  initialUrl: string | null;
  onUploaded: (storageKey: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(initialUrl);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setPending(true);

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    const uploadResult = await requestUploadUrlAction({
      prefix: "previews",
      originalName: file.name,
      contentType: file.type || "application/octet-stream",
      contentLength: file.size,
    });
    if (!uploadResult.ok) {
      setError(uploadResult.error);
      setPending(false);
      return;
    }

    const putResponse = await fetch(uploadResult.data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!putResponse.ok) {
      setError("Не удалось загрузить файл");
      setPending(false);
      return;
    }

    if (modelId) {
      const saveResult = await addModelImageAction(modelId, uploadResult.data.storageKey);
      if (!saveResult.ok) {
        setError(saveResult.error);
        setPending(false);
        return;
      }
      setPreviewUrl(saveResult.data.url);
    }

    onUploaded(uploadResult.data.storageKey);
    setPending(false);
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <h3 className="text-sm font-bold text-ink">Основное изображение превью</h3>

      <div className="mt-3 aspect-video w-full overflow-hidden rounded-control bg-surface-alt">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URL / S3 URL, not a local/optimizable asset
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-ink-muted">Нет изображения</div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="mt-3 w-full rounded-control bg-surface-alt px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-border/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Загрузка…" : previewUrl ? "Заменить картинку" : "Загрузить картинку"}
      </button>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
