import { getCurrentUser } from "@modules/auth";
import { getCartItemCount } from "@modules/cart";

/**
 * Kept as an isolated component (rather than inlined into SiteHeader)
 * specifically so wiring in the real count never requires touching the
 * shared header.
 */
export async function CartBadge() {
  const user = await getCurrentUser();
  if (!user) return null;

  const count = await getCartItemCount(user.id);

  if (!count) return null;

  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
      {count}
    </span>
  );
}
