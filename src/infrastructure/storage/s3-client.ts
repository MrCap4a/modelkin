import { S3Client } from "@aws-sdk/client-s3";
import { getConfig } from "@shared/config";

let cachedClient: S3Client | undefined;

export function getS3Client(): S3Client {
  if (!cachedClient) {
    const config = getConfig().storage;
    cachedClient = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return cachedClient;
}
