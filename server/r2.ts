import {
  CreateBucketCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

let client: S3Client | null = null;

function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );
}

function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error("R2 storage is not configured");
  }
  if (client) return client;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 storage is not configured");
  }
  client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey
    },
    forcePathStyle: true
  });
  return client;
}

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2 bucket is not configured");
  return bucket;
}

async function ensureBucket(): Promise<void> {
  const s3 = getR2Client();
  const bucket = getBucketName();
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    const r2Error = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (r2Error && (r2Error.name === "NotFound" || r2Error.$metadata?.httpStatusCode === 404)) {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
      return;
    }
    throw error;
  }
}

async function putObject(key: string, body: Buffer | Uint8Array | string, contentType: string): Promise<void> {
  await getR2Client().send(new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: body,
    ContentType: contentType
  }));
}

async function getObject(key: string): Promise<GetObjectCommandOutput> {
  return getR2Client().send(new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key
  }));
}

async function streamToString(stream: AsyncIterable<Buffer | Uint8Array | string>): Promise<string> {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export {
  ensureBucket,
  getObject,
  isR2Configured,
  putObject,
  streamToString
};
