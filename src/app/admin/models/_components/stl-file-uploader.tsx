"use client";

import { useRef, useState } from "react";
import { requestUploadUrlAction } from "@modules/files/presentation/actions";
import { addModelFileAction } from "../actions";

export interface StagedStlFile {
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function UploadCloudIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

/** Same dual create/edit behavior as PreviewImageUploader — see its header comment. */
export function StlFileUploader({
  modelId,
  initialFile,
  onUploaded,
}: {
  modelId: string | null;
  initialFile: { originalName: string; size: number } | null;
  onUploaded: (file: StagedStlFile) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileMeta, setFileMeta] = useState(initialFile);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".stl")) {
      setError("Поддерживается только формат STL");
      return;
    }

    setError(null);
    setPending(true);
    setProgressPct(0);

    const uploadResult = await requestUploadUrlAction({
      prefix: "models",
      originalName: file.name,
      contentType: file.type || "application/octet-stream",
      contentLength: file.size,
    });
    if (!uploadResult.ok) {
      setError(uploadResult.error);
      setPending(false);
      setProgressPct(null);
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
      setProgressPct(null);
      return;
    }
    setProgressPct(100);

    const mimeType = file.type || "application/octet-stream";

    if (modelId) {
      const saveResult = await addModelFileAction(
        modelId,
        uploadResult.data.storageKey,
        file.name,
        mimeType,
        file.size,
      );
      if (!saveResult.ok) {
        setError(saveResult.error);
        setPending(false);
        return;
      }
    }

    setFileMeta({ originalName: file.name, size: file.size });
    onUploaded({ storageKey: uploadResult.data.storageKey, originalName: file.name, mimeType, size: file.size });
    setPending(false);
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <h3 className="text-sm font-bold text-ink">STL файл модели</h3>

      <div
        onClick={() => inputRef.current?.click()}
        className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-control border-2 border-dashed border-border bg-surface-alt px-4 py-8 text-center transition-colors hover:border-primary"
      >
        <span className="text-primary">
          <UploadCloudIcon />
        </span>
        {fileMeta ? (
          <>
            <p className="mt-2 truncate text-sm font-medium text-ink">{fileMeta.originalName}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {formatFileSize(fileMeta.size)}
              {progressPct !== null ? ` · Загружен на ${progressPct}%` : ""}
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm font-medium text-ink">Перетащите STL файл сюда</p>
            <p className="mt-1 text-xs text-ink-muted">Или нажмите, чтобы выбрать файл</p>
          </>
        )}
        <input ref={inputRef} type="file" accept=".stl" className="hidden" onChange={handleChange} />
      </div>

      {pending && <p className="mt-2 text-xs text-ink-muted">Загрузка…</p>}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
