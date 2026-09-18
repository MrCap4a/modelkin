import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@modules/auth";
import { listOwnedModels } from "@modules/downloads";
import { isAuthor } from "@modules/authors";
import { ProfileShell } from "../_components/profile-shell";
import { DownloadButton } from "./_components/download-button";

export const metadata: Metadata = { title: "Купленные модели" };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} МБ`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export default async function PurchasesPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    redirect("/login");
  }

  const [ownedModels, authorFlag] = await Promise.all([
    listOwnedModels(sessionUser.id),
    isAuthor(sessionUser.id),
  ]);

  return (
    <ProfileShell heading="Личный кабинет" active="purchases" showAuthorTab={authorFlag}>
      {ownedModels.length === 0 ? (
        <div className="flex flex-col items-center rounded-card border border-border bg-surface px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-alt text-ink-muted">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 4h2l1 12a2 2 0 002 2h9a2 2 0 002-2l1-9H6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink">У вас пока нет купленных моделей</h2>
          <p className="mt-2 max-w-md text-sm text-ink-muted">
            Перейдите в наш каталог, выберите подходящий STL файл, протестированный инженерами
            Моделкина, и он появится здесь для моментального скачивания.
          </p>
          <Link
            href="/models"
            className="mt-6 rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Перейти в каталог моделей
          </Link>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-bold text-ink">Доступно для скачивания ({ownedModels.length})</h2>
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ownedModels.map((model) => (
              <div
                key={model.modelId}
                className="overflow-hidden rounded-card border border-border bg-surface"
              >
                <Link href={`/models/${model.slug}`} className="block aspect-[4/3] bg-surface-alt">
                  {model.previewImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- public S3 preview URL
                    <img
                      src={model.previewImageUrl}
                      alt={model.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </Link>
                <div className="p-4">
                  <div className="flex items-center justify-between text-xs text-ink-muted">
                    <span>STL · {formatBytes(model.fileSizeBytes)}</span>
                  </div>
                  <Link href={`/models/${model.slug}`}>
                    <h3 className="mt-1.5 font-semibold text-ink hover:text-primary">{model.title}</h3>
                  </Link>
                  <p className="mt-1 text-xs text-ink-muted">Куплено: {formatDate(model.purchasedAt)}</p>
                  <div className="mt-4">
                    <DownloadButton modelId={model.modelId} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ProfileShell>
  );
}
