import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getConfig } from "@shared/config";
import { StorageError } from "@shared/errors";
import { getS3Client } from "./s3-client";

export type StoragePrefix = keyof ReturnType<typeof getConfig>["storage"]["storagePrefixes"];

const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

/**
 * Extension allowlist per prefix. Uploads are validated against both MIME
 * type (checked by the caller against the declared Content-Type) and this
 * extension list (ТЗ §46) — never trust the original filename as a storage
 * path, only as metadata.
 */
const ALLOWED_EXTENSIONS: Record<StoragePrefix, string[]> = {
  models: [".stl"],
  avatars: [".jpg", ".jpeg", ".png", ".webp"],
  customOrders: [".jpg", ".jpeg", ".png", ".pdf", ".webp"],
  previews: [".jpg", ".jpeg", ".png", ".webp"],
};

export function isExtensionAllowed(prefixKey: StoragePrefix, originalName: string): boolean {
  const ext = path.extname(originalName).toLowerCase();
  return ALLOWED_EXTENSIONS[prefixKey].includes(ext);
}

/**
 * Generates a random, collision-resistant storage key. Never derives the key
 * from the user-supplied filename — that name is kept only as metadata
 * (ModelFile.originalName / CustomOrderFile.originalName), preventing path
 * traversal and filename-based attacks (ТЗ §46).
 */
export function generateStorageKey(prefixKey: StoragePrefix, originalName: string): string {
  const config = getConfig();
  const prefix = config.storage.storagePrefixes[prefixKey];
  const ext = path.extname(originalName).toLowerCase();
  return `${prefix}${randomUUID()}${ext}`;
}

/**
 * Only `previews/` and `avatars/` are public-read (see the `minio-init`
 * bucket policy in docker-compose.yml) — plain display assets rendered as
 * `<img src>`, cheap to construct a URL for without a per-request signature.
 * `models/` (STL) and `custom-orders/` stay private and MUST go through
 * `createPresignedDownloadUrl` behind an ownership/admin check instead —
 * never call this for those prefixes.
 */
export function getPublicObjectUrl(storageKey: string): string {
  const config = getConfig().storage;
  if (!config.publicHostForCsp) {
    throw new StorageError("S3_PUBLIC_HOST_FOR_CSP не настроен");
  }
  return `${config.publicHostForCsp}/${config.bucket}/${storageKey}`;
}

export async function createPresignedUploadUrl(params: {
  key: string;
  contentType: string;
  /**
   * Exact declared size of the file the client is about to upload (S3 will
   * reject the PUT if the actual body length differs). The caller (files
   * module use case) must validate this against the per-prefix size limit
   * BEFORE calling this function — this function does not enforce a limit
   * itself, it only pins the upload to the size that was validated.
   */
  contentLength: number;
}): Promise<{ url: string; expiresInSeconds: number }> {
  try {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: getConfig().storage.bucket,
      Key: params.key,
      ContentType: params.contentType,
      ContentLength: params.contentLength,
    });
    const url = await getSignedUrl(client, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
    return { url, expiresInSeconds: UPLOAD_URL_TTL_SECONDS };
  } catch (error) {
    throw new StorageError("Не удалось создать ссылку для загрузки файла", {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function createPresignedDownloadUrl(params: {
  key: string;
  downloadFileName?: string;
}): Promise<{ url: string; expiresInSeconds: number }> {
  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: getConfig().storage.bucket,
      Key: params.key,
      ...(params.downloadFileName
        ? {
            ResponseContentDisposition: `attachment; filename="${encodeURIComponent(params.downloadFileName)}"`,
          }
        : {}),
    });
    const url = await getSignedUrl(client, command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
    return { url, expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS };
  } catch (error) {
    throw new StorageError("Не удалось создать ссылку для скачивания файла", {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function deleteStorageObject(key: string): Promise<void> {
  try {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({ Bucket: getConfig().storage.bucket, Key: key }),
    );
  } catch (error) {
    throw new StorageError("Не удалось удалить файл", {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    const client = getS3Client();
    await client.send(new HeadObjectCommand({ Bucket: getConfig().storage.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}
