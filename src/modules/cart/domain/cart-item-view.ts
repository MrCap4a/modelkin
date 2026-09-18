/**
 * Read model for one cart row (ТЗ §22): joined from Model/ModelImage/Tag so
 * the presentation layer never has to reach into Prisma itself.
 */
export interface CartItemView {
  modelId: string;
  title: string;
  slug: string;
  /** Current price (kopecks), read live from `Model` — never cached. */
  price: number;
  previewImageUrl: string | null;
  tagName: string | null;
}

export interface CartSummary {
  items: CartItemView[];
  /** Always recomputed server-side from current `Model.price` — ТЗ §22. */
  totalAmount: number;
}
