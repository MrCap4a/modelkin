import Link from "next/link";
import { getRandomModels } from "@modules/catalog";
import { ModelCard } from "./_components/model-card";
import { SearchBar } from "./_components/search-bar";

// Always render fresh on every request — a random sample should actually
// change between visits, not get cached/prerendered once.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const randomModels = await getRandomModels(4);

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-ink sm:text-5xl">
              Точные 3D-модели для идеальной печати
            </h1>

            <p className="mt-4 max-w-xl text-ink-muted">
              STL-модели органайзеров, декора и полезных мелочей — каждую мы печатаем сами перед
              публикацией, чтобы файл был готов к слайсингу без доработок.
            </p>

            <div className="mt-6">
              <SearchBar />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/models"
                className="rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                Перейти в каталог
              </Link>
              <Link
                href="/custom-order"
                className="rounded-control border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-alt"
              >
                Индивидуальный заказ
              </Link>
            </div>
          </div>

          <div className="aspect-[4/3] w-full overflow-hidden rounded-card">
            {/* Static local SVG (public/pic1.svg) — next/image requires
                dangerouslyAllowSVG for SVG sources, not worth the extra
                config surface for one hero image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pic1.svg"
              alt="Настольная лампа, органайзеры и подставка для телефона, напечатанные на 3D-принтере"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Random recommendations */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-ink">Случайные рекомендации</h2>
          <Link href="/models" className="text-sm font-semibold text-primary hover:text-primary-hover">
            Смотреть все модели →
          </Link>
        </div>

        {randomModels.length === 0 ? (
          <p className="mt-8 text-ink-muted">Пока нет опубликованных моделей.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {randomModels.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        )}
      </section>

      {/* How we develop models */}
      <section className="bg-surface-alt py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-card border border-border bg-surface p-8 shadow-card sm:p-10">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              Как мы разрабатываем модели
            </span>
            <h2 className="mt-3 text-2xl font-bold text-ink">Модели создаются специально для 3D-печати</h2>
            <p className="mt-4 max-w-3xl text-ink-muted">
              Мы проектируем модели с учётом реального процесса печати: от подготовки файла и выбора
              ориентации до стабильного результата и удобного использования. Поэтому их проще
              слайсить, надёжнее печатать и комфортнее применять в жизни.
            </p>
          </div>
        </div>
      </section>

      {/* Custom order CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-8 rounded-card bg-ink p-8 sm:p-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Нужна уникальная модель по вашему чертежу или задумке?
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Опишите задачу или пришлите эскиз — мы подготовим модель под 3D-печать и выдадим
              готовый STL файл.
            </p>
            <Link
              href="/custom-order"
              className="mt-6 inline-block rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Создать заявку на моделирование
            </Link>
          </div>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- see note on pic1.svg above */}
            <img
              src="/pic2.svg"
              alt="Инженер измеряет напечатанную деталь по чертежу"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
