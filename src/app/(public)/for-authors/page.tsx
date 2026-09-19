import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Для авторов моделей" };

const STEPS = [
  {
    title: "Подготовьте модель",
    description:
      "Соберите всё, что нужно для карточки товара: сам STL-файл, изображения/превью модели, название и описание — как модель печатается, для чего подходит, есть ли особенности слайсинга.",
  },
  {
    title: "Напишите администратору",
    description:
      "Отправьте заявку на support@modelkin.ru с описанием модели и приложенными материалами. Мы обсудим детали, при необходимости поможем скорректировать карточку и расскажем об условиях размещения (в том числе о комиссии площадки).",
  },
  {
    title: "Публикация",
    description:
      "Если всё устраивает обе стороны, мы публикуем модель на сайте и указываем вас автором — по email, который вы использовали при регистрации на Моделкин.рф.",
  },
  {
    title: "Продажи и выплаты",
    description:
      "В личном кабинете появится вкладка «Кабинет автора» — там видно статистику продаж по каждой модели и накопленный доход. Как только баланс достигает минимальной суммы вывода, можно запросить выплату.",
  },
];

export default function ForAuthorsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Для авторов моделей</h1>
      <p className="mt-4 text-ink-muted">
        Хотите разместить свою 3D-модель на Моделкин.рф и получать доход с продаж? Вот как это
        устроено.
      </p>

      <ol className="mt-10 space-y-8">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {index + 1}
            </span>
            <div>
              <h2 className="font-semibold text-ink">{step.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 rounded-card border border-border bg-surface-alt p-6">
        <p className="text-sm text-ink-muted">
          Готовы отправить модель на рассмотрение? Напишите нам на{" "}
          <a href="mailto:support@modelkin.ru" className="font-medium text-primary hover:underline">
            support@modelkin.ru
          </a>
          . Если у вас ещё нет аккаунта — сначала{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            зарегистрируйтесь
          </Link>
          , чтобы мы могли указать вас автором.
        </p>
      </div>
    </div>
  );
}
