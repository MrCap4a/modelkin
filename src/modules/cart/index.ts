// Public contract of the cart module. Other modules and app/** should only
// ever import from here, never reach into application/*or infrastructure/*
// directly.

export { getOrCreateCart } from "./application/get-or-create-cart";
export { addItemToCart } from "./application/add-item-to-cart";
export { removeItemFromCart } from "./application/remove-item-from-cart";
export { getCart } from "./application/get-cart";
export { getCartItemCount } from "./application/get-cart-item-count";
export { isModelInCart } from "./application/is-model-in-cart";
export type { CartItemView, CartSummary } from "./domain/cart-item-view";
