import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Моделкин — 3D-модели для печати",
    template: "%s — Моделкин",
  },
  description:
    "Маркетплейс проверенных 3D-моделей в формате STL для домашней и промышленной печати.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
