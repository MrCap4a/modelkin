import type { Metadata } from "next";
import { listTags } from "@modules/tags";
import { PageHeader } from "../../_components/page-header";
import { ModelForm } from "../_components/model-form";

export const metadata: Metadata = { title: "Добавить модель" };

export default async function NewModelPage() {
  const availableTags = await listTags();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <PageHeader title="Добавить 3D-модель" subtitle="Загрузка файлов, характеристик и параметров печати" />
      <div className="mt-6">
        <ModelForm initial={null} availableTags={availableTags} />
      </div>
    </div>
  );
}
