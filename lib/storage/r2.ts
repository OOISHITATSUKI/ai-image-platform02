// ============================================================
// Cloudflare R2 storage utility
// Requires: npm install @aws-sdk/client-s3
// ============================================================

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function uploadToR2(
  buffer: Buffer,
  remoteKey: string,
  contentType: string = 'video/mp4',
): Promise<string> {
  const r2 = getClient();
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: remoteKey,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    }),
  );
  return `${process.env.R2_PUBLIC_URL}/${remoteKey}`;
}

export async function deleteFromR2(remoteKey: string): Promise<void> {
  const r2 = getClient();
  await r2.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: remoteKey,
    }),
  );
}
