"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestUploadUrlAction } from "@modules/files/presentation/actions";
import { updateAvatarAction } from "../actions";

export function AvatarUploader({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);

    startTransition(async () => {
      const uploadResult = await requestUploadUrlAction({
        prefix: "avatars",
        originalName: file.name,
        contentType: file.type || "application/octet-stream",
        contentLength: file.size,
      });
      if (!uploadResult.ok) {
        setError(uploadResult.error);
        return;
      }

      const putResponse = await fetch(uploadResult.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putResponse.ok) {
        setError("Не удалось загрузить файл");
        return;
      }

      const saveResult = await updateAvatarAction({ storageKey: uploadResult.data.storageKey });
      if (!saveResult.ok) {
        setError(saveResult.error);
        return;
      }

      setPreview(saveResult.data);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center text-center">
      <span className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-surface-alt text-3xl font-semibold text-ink-muted">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- public S3 URL, not a local/optimizable asset
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          (name || "?").charAt(0).toUpperCase()
        )}
      </span>

      <h2 className="mt-4 text-lg font-bold text-ink">{name}</h2>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="mt-4 w-full rounded-control border border-border px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Загрузка..." : "Сменить фото"}
      </button>

      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
