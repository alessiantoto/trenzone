import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export function getR2PublicBaseUrl(): string {
  const raw =
    process.env.R2_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_R2_URL ||
    process.env.NEXT_PUBLIC_CDN_URL ||
    "";
  return raw.trim().replace(/\/+$/, "");
}

export async function uploadToR2(
  fileBuffer: Buffer | Uint8Array | Blob,
  fileName: string,
  contentType: string
): Promise<string> {
  const bucketName = process.env.R2_BUCKET_NAME;
  const baseUrl = getR2PublicBaseUrl();

  if (!bucketName || !baseUrl) {
    throw new Error("R2 environment variables are not properly set.");
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await r2.send(command);

  return `${baseUrl}/${fileName}`;
}

export async function deleteFromR2(fileName: string): Promise<void> {
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!bucketName) {
    throw new Error("R2 environment variables are not properly set.");
  }

  // Extract the key if a full URL is passed
  let key = fileName;
  const publicUrl = getR2PublicBaseUrl();
  if (publicUrl && fileName.startsWith(publicUrl)) {
    key = fileName.slice(publicUrl.length).replace(/^\/+/, "");
  }

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await r2.send(command);
}
