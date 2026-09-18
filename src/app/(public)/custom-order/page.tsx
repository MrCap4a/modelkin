import type { Metadata } from "next";
import { CustomOrderForm } from "./custom-order-form";

export const metadata: Metadata = {
  title: "Индивидуальный заказ — Моделкин",
  description:
    "Не нашли нужную модель? Опишите задачу — профессиональная команда 3D-моделлеров разработает STL файл точно под ваши требования.",
};

export default function CustomOrderPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">
          Не нашли нужную модель? Создадим её для вас
        </h1>
        <p className="mt-4 text-ink-muted">
          Профессиональная команда 3D-моделлеров разработает STL файл точно под ваши требования
        </p>
      </div>

      <div className="mt-12">
        <CustomOrderForm />
      </div>
    </div>
  );
}
