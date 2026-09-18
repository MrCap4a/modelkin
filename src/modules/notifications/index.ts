// Public contract of the notifications module. Other modules should only
// ever import from here.

export {
  notifyCustomOrderReceived,
  type CustomOrderReceivedInput,
} from "./application/notify-custom-order-received";
export { extractEmailCandidate } from "./domain/email-detection";
