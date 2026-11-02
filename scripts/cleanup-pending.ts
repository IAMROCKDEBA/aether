/**
 * Removes uploads that were authorised but never completed (older than 24 h),
 * deleting both the S3 object (if any) and the database row.
 * Safe to run repeatedly, e.g. from a daily cron: `pnpm cleanup`.
 */
import "dotenv/config";
import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

async function main() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let removed = 0;
  for (;;) {
    const batch = await db.file.findMany({
      where: { status: "PENDING", createdAt: { lt: cutoff } },
      select: { id: true, s3Key: true },
      take: 500,
    });
    if (!batch.length) break;
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: process.env.S3_BUCKET,
        Delete: { Objects: batch.map((f) => ({ Key: f.s3Key })), Quiet: true },
      }),
    );
    await db.file.deleteMany({ where: { id: { in: batch.map((f) => f.id) } } });
    removed += batch.length;
  }
  console.log(`Removed ${removed} abandoned upload(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
