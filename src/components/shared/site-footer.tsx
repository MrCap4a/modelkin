import Link from "next/link";
import { CATALOG_TAGS } from "@shared/constants/catalog-tags";
import { Logo } from "./logo";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface-alt">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-ink-muted">
              Маркетплейс качественных, оптимизированных и проверенных 3D-моделей для домашней и
              промышленной FDM/SLA печати.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Каталог
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {CATALOG_TAGS.slice(0, 3).map((tag) => (
                <li key={tag.slug}>
                  <Link
                    href={`/models?tag=${tag.slug}`}
                    className="text-ink hover:text-primary"
                  >
                    {tag.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Услуги
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/custom-order" className="text-ink hover:text-primary">
                  Индивидуальный заказ
                </Link>
              </li>
              <li>
                <span className="text-ink-muted">Для авторов моделей</span>
              </li>
              <li>
                <span className="text-ink-muted">Помощь печатникам</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Контакты
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="mailto:support@modelkin.ru" className="text-ink hover:text-primary">
                  support@modelkin.ru
                </a>
              </li>
              <li className="text-ink-muted">Telegram: @modelkin_support</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Моделкин. Все права защищены. Сделано с любовью к 3D-печати.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-primary">
              Пользовательское соглашение
            </Link>
            <Link href="/license" className="hover:text-primary">
              Лицензия STL
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
