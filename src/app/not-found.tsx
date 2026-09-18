import Link from "next/link";
import { SiteChrome } from "@components/shared/site-chrome";

export default function NotFound() {
  return (
    <SiteChrome>
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <h1 className="text-3xl font-bold text-ink">Страница не найдена</h1>
        <p className="mt-3 text-ink-muted">
          Возможно, модель была снята с публикации или ссылка устарела.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          На главную
        </Link>
      </div>
    </SiteChrome>
  );
}
