"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled client error", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-ink">Что-то пошло не так</h1>
      <p className="mt-3 text-ink-muted">Попробуйте обновить страницу.</p>
      <button
        onClick={reset}
        className="mt-6 rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        Повторить
      </button>
    </div>
  );
}
