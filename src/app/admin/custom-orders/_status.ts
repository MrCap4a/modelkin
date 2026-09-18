import type { CustomOrderStatus } from "@modules/custom-orders/domain/custom-order";
import type { BadgeTone } from "../_components/status-badge";

export const STATUS_LABEL: Record<CustomOrderStatus, string> = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  WAITING_FOR_REPLY: "Ожидает ответа",
  COMPLETED: "Выполнена",
  CANCELLED: "Отменена",
};

export const STATUS_TONE: Record<CustomOrderStatus, BadgeTone> = {
  NEW: "danger",
  IN_PROGRESS: "info",
  WAITING_FOR_REPLY: "warning",
  COMPLETED: "success",
  CANCELLED: "neutral",
};
