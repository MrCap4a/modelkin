// Public contract of the custom-orders module. Other modules (and the
// admin module, later) should only ever import from here, never reach into
// `application/*`, `domain/*` internals, or `infrastructure/*` directly.

export {
  CUSTOM_ORDER_STATUSES,
  type ContactType,
  type CustomOrderStatus,
  type CustomOrderSummary,
  type CustomOrderDetail,
  type CustomOrderFileAttachment,
} from "./domain/custom-order";
export {
  customOrderSubmissionSchema,
  customOrderAttachmentSchema,
  CONTACT_TYPES,
  CONTACT_TYPE_LABELS,
  type CustomOrderSubmissionInput,
  type CustomOrderAttachmentInput,
} from "./domain/custom-order-schema";

export { submitCustomOrder } from "./application/submit-custom-order";
export { updateCustomOrderStatus } from "./application/update-custom-order-status";
export { listCustomOrders } from "./application/list-custom-orders";
export { getCustomOrderDetail } from "./application/get-custom-order-detail";

export {
  submitCustomOrderAction,
  type SubmitCustomOrderActionResult,
} from "./presentation/actions";
