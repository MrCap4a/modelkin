import { getCurrentUser } from "@modules/auth";

/**
 * TODO(cart module owner): replace the hard-coded `null` below with a real
 * call into `@modules/cart` (e.g. `getCartItemCount(user.id)`), once that
 * module exists. Kept as an isolated component (rather than inlined into
 * SiteHeader) specifically so wiring in the real count never requires
 * touching the shared header.
 */
export async function CartBadge() {
  const user = await getCurrentUser();
  if (!user) return null;

  const count: number | null = null;

  if (!count) return null;

  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
      {count}
    </span>
  );
}
