import { S3Client } from "@aws-sdk/client-s3";
import { getConfig } from "@shared/config";

let cachedClient: S3Client | undefined;
let cachedPublicClient: S3Client | undefined;

function buildClient(endpoint: string): S3Client {
  const config = getConfig().storage;
  return new S3Client({
    endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/**
 * Internal endpoint (S3_ENDPOINT) — for server-to-server calls (HeadObject,
 * DeleteObject) that never leave this process/network.
 */
export function getS3Client(): S3Client {
  if (!cachedClient) {
    cachedClient = buildClient(getConfig().storage.endpoint);
  }
  return cachedClient;
}

/**
 * Browser-reachable endpoint (S3_PUBLIC_HOST_FOR_CSP, falling back to
 * S3_ENDPOINT — see config). MUST be used to presign any URL the browser
 * will fetch directly (upload PUT / download GET): a SigV4 signature binds
 * the host it was signed for, so signing against the internal endpoint and
 * swapping the host afterwards would just invalidate the signature.
 */
export function getPublicS3Client(): S3Client {
  if (!cachedPublicClient) {
    const config = getConfig().storage;
    cachedPublicClient = buildClient(config.publicHostForCsp ?? config.endpoint);
  }
  return cachedPublicClient;
}
