import type { Metadata } from "next";
import { PageHeader } from "../../_components/page-header";
import { ModelForm } from "../_components/model-form";

export const metadata: Metadata = { title: "Добавить модель" };

export default function NewModelPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <PageHeader title="Добавить 3D-модель" subtitle="Загрузка файлов, характеристик и параметров печати" />
      <div className="mt-6">
        <ModelForm initial={null} />
      </div>
    </div>
  );
}
