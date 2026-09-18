import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getModelForAdmin, type ModelAdminStatus } from "@modules/models";
import { PageHeader } from "../../_components/page-header";
import { StatusBadge, type BadgeTone } from "../../_components/status-badge";
import { ModelForm, type ModelFormInitialData } from "../_components/model-form";
import { HideModelButton } from "../_components/hide-model-button";

export const metadata: Metadata = { title: "Редактировать модель" };

const STATUS_LABEL: Record<ModelAdminStatus, string> = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликована",
  HIDDEN: "Скрыта",
};

const STATUS_TONE: Record<ModelAdminStatus, BadgeTone> = {
  DRAFT: "warning",
  PUBLISHED: "success",
  HIDDEN: "neutral",
};

export default async function EditModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const model = await getModelForAdmin(id);

  if (!model) {
    notFound();
  }

  const initial: ModelFormInitialData = {
    id: model.id,
    title: model.title,
    description: model.description,
    price: model.price,
    tagSlugs: model.tags.map((tag) => tag.slug),
    authorEmail: model.author?.email ?? "",
    imageUrl: model.images[0]?.url ?? null,
    file: model.files[0] ? { originalName: model.files[0].originalName, size: model.files[0].size } : null,
    status: model.status,
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <PageHeader
        title={model.title}
        subtitle="Редактирование модели"
        action={
          <div className="flex items-center gap-3">
            <StatusBadge label={STATUS_LABEL[model.status]} tone={STATUS_TONE[model.status]} />
            {model.status !== "HIDDEN" && <HideModelButton modelId={model.id} />}
          </div>
        }
      />
      <div className="mt-6">
        <ModelForm initial={initial} />
      </div>
    </div>
  );
}
