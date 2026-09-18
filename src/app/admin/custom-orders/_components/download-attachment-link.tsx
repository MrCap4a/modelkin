"use client";

import { useTransition } from "react";
import { getCustomOrderFileDownloadUrlAction } from "../actions";

export function DownloadAttachmentLink({ customOrderId, fileId }: { customOrderId: string; fileId: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await getCustomOrderFileDownloadUrlAction(customOrderId, fileId);
      if (result.ok) {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      }
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className="shrink-0 text-sm font-semibold text-primary transition-colors hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Получение ссылки…" : "Скачать"}
    </button>
  );
}
