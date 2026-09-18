"use client";

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { ModelImageView } from "@modules/models";

// `ssr: false` is required for the WebGL viewer (ТЗ §18: lazy-loaded, must
// not block/ship with initial page load) and is only legal inside a Client
// Component — this file is already "use client", so the dynamic import
// lives here rather than in a separate wrapper.
const ModelViewer = dynamic(() => import("./model-viewer").then((mod) => mod.ModelViewer), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-ink-muted">
      Загрузка 3D-просмотра…
    </div>
  ),
});

type ThumbItem = { kind: "image"; image: ModelImageView } | { kind: "3d" };

function buildThumbs(images: ModelImageView[], hasViewerModel: boolean): ThumbItem[] {
  const thumbs: ThumbItem[] = [];

  images.forEach((image, index) => {
    thumbs.push({ kind: "image", image });
    // Matches design.pdf's gallery order (photo, 3D toggle, photo) — the 3D
    // thumbnail sits right after the first photo.
    if (index === 0 && hasViewerModel) {
      thumbs.push({ kind: "3d" });
    }
  });

  if (thumbs.length === 0 && hasViewerModel) {
    thumbs.push({ kind: "3d" });
  }

  return thumbs;
}

export function Gallery({
  images,
  hasViewerModel,
  slug,
  title,
}: {
  images: ModelImageView[];
  hasViewerModel: boolean;
  slug: string;
  title: string;
}) {
  const thumbs = buildThumbs(images, hasViewerModel);
  const [selected, setSelected] = useState(0);
  const active: ThumbItem | undefined = thumbs[selected];

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-card border border-border bg-surface-alt">
        {active?.kind === "3d" ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
              <span className="rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-white">
                Вращайте мышью
              </span>
              <span className="rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-white">
                Колёсико — масштаб
              </span>
            </div>
            <ModelViewer slug={slug} />
          </>
        ) : active?.kind === "image" ? (
          <Image
            src={active.image.url}
            alt={active.image.alt ?? title}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-contain"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-ink-muted">
            Нет изображения
          </div>
        )}
      </div>

      {thumbs.length > 1 && (
        <div className="mt-4 flex gap-3">
          {thumbs.map((thumb, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={thumb.kind === "3d" ? "3D-просмотр" : `Изображение ${index + 1}`}
              aria-pressed={selected === index}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-control border-2 transition-colors ${
                selected === index ? "border-primary" : "border-transparent"
              }`}
            >
              {thumb.kind === "3d" ? (
                <div className="flex h-full w-full items-center justify-center bg-ink text-white">
                  <span className="text-xs font-semibold">3D</span>
                </div>
              ) : (
                <Image src={thumb.image.url} alt="" fill sizes="80px" className="object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
