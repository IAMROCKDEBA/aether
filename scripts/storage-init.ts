/**
 * Prepares the S3 bucket for Aether:
 *   • creates it when using a local S3-compatible endpoint (never on AWS, where
 *     you create it in the console so region/ownership are deliberate),
 *   • applies the CORS rule browsers need for direct uploads and previews,
 *   • enforces "Block all public access" (AWS) so nothing is ever public by URL.
 *
 * Usage: pnpm storage:init
 */
import "dotenv/config";
import {
  CreateBucketCommand,
  GetPublicAccessBlockCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutPublicAccessBlockCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const need = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Copy .env.example to .env first.`);
  return value;
};

const Bucket = need("S3_BUCKET");
const appUrl = need("APP_URL").replace(/\/+$/, "");
const endpoint = process.env.S3_ENDPOINT || undefined;

const s3 = new S3Client({
  region: need("S3_REGION"),
  endpoint,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: { accessKeyId: need("S3_ACCESS_KEY_ID"), secretAccessKey: need("S3_SECRET_ACCESS_KEY") },
});

async function main() {
  console.log(`→ Bucket "${Bucket}" ${endpoint ? `at ${endpoint}` : "on Amazon S3"}`);

  try {
    await s3.send(new HeadBucketCommand({ Bucket }));
    console.log("  ✓ bucket reachable with these credentials");
  } catch (error) {
    if (!endpoint) {
      throw new Error(`Cannot access bucket on AWS (${(error as Error).name}). Check the name, region and IAM policy in docs/AWS_SETUP.md.`);
    }
    await s3.send(new CreateBucketCommand({ Bucket }));
    console.log("  ✓ created local bucket");
  }

  const origins = [...new Set([appUrl, "http://localhost:3000"])];
  await s3.send(
    new PutBucketCorsCommand({
      Bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: origins,
            AllowedMethods: ["GET", "HEAD", "POST"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
  console.log(`  ✓ CORS allows ${origins.join(", ")}`);

  try {
    await s3.send(
      new PutPublicAccessBlockCommand({
        Bucket,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: true,
          RestrictPublicBuckets: true,
        },
      }),
    );
    const { PublicAccessBlockConfiguration: pab } = await s3.send(new GetPublicAccessBlockCommand({ Bucket }));
    const all = pab && Object.values(pab).every(Boolean);
    console.log(`  ✓ Block Public Access: ${all ? "ALL ON" : JSON.stringify(pab)}`);
  } catch (error) {
    if (endpoint) console.log("  • local storage has no public-access-block API; bucket is private by default");
    else console.warn(`  ! could not set Block Public Access (${(error as Error).name}); enable it in the S3 console.`);
  }

  console.log("Storage ready.");
}

main().catch((error) => {
  console.error(`✗ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
