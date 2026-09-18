export interface OwnedModelSummary {
  modelId: string;
  title: string;
  slug: string;
  previewImageUrl: string | null;
  fileSizeBytes: number;
  purchasedAt: Date;
}

export interface SignedDownload {
  url: string;
  fileName: string;
}
