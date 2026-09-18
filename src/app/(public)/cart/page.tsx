import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@modules/auth";
import { getCart, type CartItemView } from "@modules/cart";
import { removeFromCartAction, checkoutAction } from "./actions";

function formatPrice(amountKopecks: number): string {
  return `${Math.round(amountKopecks / 100).toLocaleString("ru-RU")} ₽`;
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-8 0l1 13a2 2 0 002 2h4a2 2 0 002-2l1-13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-success"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.5 12.5l2.2 2.2L15.5 9.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-warning"
    >
      <path
        d="M12 3l10 18H2L12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 9.5v4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" />
    </svg>
  );
}

function EmptyCart() {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-card border border-border bg-surface-alt p-5">
      <WarningIcon />
      <div>
        <p className="font-medium text-ink">Ваша корзина пуста</p>
        <p className="mt-1 text-sm text-ink-muted">
          Перейдите в{" "}
          <Link href="/models" className="text-primary hover:underline">
            каталог моделей
          </Link>
          , чтобы добавить свои первые STL-файлы для печати.
        </p>
      </div>
    </div>
  );
}

function CartItemRow({ item }: { item: CartItemView }) {
  return (
    <li className="flex items-center gap-4 rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-control bg-surface-alt">
        {item.previewImageUrl ? (
          <Image
            src={item.previewImageUrl}
            alt=""
            width={64}
            height={64}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        {item.tagName ? <p className="text-xs text-ink-muted">{item.tagName}</p> : null}
        <Link
          href={`/models/${item.slug}`}
          className="block truncate font-medium text-ink hover:text-primary"
        >
          {item.title}
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <span className="font-semibold text-ink">{formatPrice(item.price)}</span>
        <form action={removeFromCartAction.bind(null, item.modelId)}>
          <button
            type="submit"
            aria-label="Удалить из корзины"
            className="flex h-9 w-9 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-alt hover:text-danger"
          >
            <TrashIcon />
          </button>
        </form>
      </div>
    </li>
  );
}

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-ink">Корзина</h1>
        <p className="mt-3 text-ink-muted">
          Войдите в аккаунт, чтобы увидеть корзину и оформить заказ.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Войти
        </Link>
      </div>
    );
  }

  const cart = await getCart(user.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink">Корзина ({cart.items.length})</h1>

      {error ? (
        <div className="mt-6 rounded-control border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {cart.items.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <ul className="flex flex-col gap-4">
            {cart.items.map((item) => (
              <CartItemRow key={item.modelId} item={item} />
            ))}
          </ul>

          <aside className="h-fit rounded-card border border-border bg-surface p-6 shadow-card">
            <h2 className="text-lg font-semibold text-ink">Итоговая сумма</h2>

            <div className="mt-4 flex items-center justify-between text-sm text-ink-muted">
              <span>Товары ({cart.items.length} шт)</span>
              <span>{formatPrice(cart.totalAmount)}</span>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 font-semibold text-ink">
              <span>К оплате</span>
              <span>{formatPrice(cart.totalAmount)}</span>
            </div>

            <form action={checkoutAction}>
              <button
                type="submit"
                className="mt-5 w-full rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                Перейти к оплате
              </button>
            </form>

            <p className="mt-4 flex items-start gap-1.5 text-xs text-ink-muted">
              <CheckIcon />
              Безопасная оплата картами РФ. Мгновенная ссылка на скачивание архива.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
