import type { Metadata } from "next";
import { listTagsWithUsage } from "@modules/tags";
import { PageHeader } from "../_components/page-header";
import { TagsManager } from "./_components/tags-manager";

export const metadata: Metadata = { title: "Категории" };

export default async function AdminTagsPage() {
  const tags = await listTagsWithUsage();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 sm:px-8">
      <PageHeader title="Категории" subtitle="Управление категориями моделей, используемыми в каталоге" />
      <div className="mt-6">
        <TagsManager tags={tags} />
      </div>
    </div>
  );
}
