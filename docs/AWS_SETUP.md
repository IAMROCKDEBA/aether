# Amazon S3 setup for Aether

Aether stores every file in **one private S3 bucket**. Nothing in the bucket is ever public: the app checks permissions first, then hands the browser a short-lived **presigned URL**. This guide sets up the bucket and a least-privilege IAM user in about 10 minutes. Everything here fits in the AWS Free Tier.

> You need an AWS account. Never use your root account's keys in an app — this guide creates a dedicated IAM user with access to this one bucket only.

---

## 1. Create the bucket

1. Open the **S3 console** → **Create bucket**.
2. **Bucket name:** something globally unique, e.g. `aether-files-<yourname>-2026` (lowercase, digits, hyphens).
3. **AWS Region:** pick one close to you, e.g. `ap-south-1` (Mumbai). Note it down.
4. **Object Ownership:** *ACLs disabled (recommended)*.
5. **Block Public Access settings:** leave **Block *all* public access** ✅ **ON**. This is essential: Aether never needs public objects.
6. **Bucket Versioning:** optional (off is fine).
7. **Default encryption:** *SSE-S3* (the default). Every object is encrypted at rest.
8. Click **Create bucket**.

## 2. Allow the browser to upload directly (CORS)

Files go straight from the browser to S3 using presigned POST policies, so the bucket must accept requests from your app's origin.

Bucket → **Permissions** → **Cross-origin resource sharing (CORS)** → **Edit**, paste:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "HEAD", "POST"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

If you open the app from another address (for example the VM's IP), add that origin to `AllowedOrigins` too.

> `pnpm storage:init` can apply this CORS rule and verify Block Public Access for you once the IAM user exists (step 4).

## 3. Create a least-privilege IAM user

1. Open the **IAM console** → **Policies** → **Create policy** → **JSON**, paste (replace `YOUR-BUCKET-NAME` twice):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AetherObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    },
    {
      "Sid": "AetherBucketAdmin",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:PutBucketCORS",
        "s3:GetBucketCORS",
        "s3:PutBucketPublicAccessBlock",
        "s3:GetBucketPublicAccessBlock"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
    }
  ]
}
```

2. Name it `AetherBucketAccess` → **Create policy**.
3. **Users** → **Create user** → name `aether-app` → *do not* give console access.
4. **Attach policies directly** → select `AetherBucketAccess` → **Create user**.
5. Open the user → **Security credentials** → **Create access key** → *Application running outside AWS* → **Create**.
6. Copy the **Access key ID** and **Secret access key**. The secret is shown only once.

## 4. Configure Aether

Put the values in `.env` (the Ubuntu setup script asks for them and writes this for you):

```dotenv
S3_REGION=ap-south-1
S3_BUCKET=aether-files-yourname-2026
S3_ACCESS_KEY_ID=AKIA................
S3_SECRET_ACCESS_KEY=........................................
S3_ENDPOINT=
S3_FORCE_PATH_STYLE=false
```

`S3_ENDPOINT` stays **empty** for Amazon S3. Then run:

```bash
pnpm storage:init
```

Expected output:

```
→ Bucket "aether-files-yourname-2026" on Amazon S3
  ✓ bucket reachable with these credentials
  ✓ CORS allows http://localhost:3000
  ✓ Block Public Access: ALL ON
Storage ready.
```

Restart the app. New uploads now land in S3 under `u/<user-id>/<random-uuid>`.

## 5. Verify it in the console (good for the demo)

- Upload a file in Aether → it appears in the bucket under `u/…`, encrypted, with no public access.
- Copy the object's **Object URL** from the console and open it in a private window → **AccessDenied**. That is the point: only Aether-issued, time-limited presigned URLs work.
- Delete the file in Aether → the object disappears from the bucket.

## Security notes

- **Never commit `.env`**. It is git-ignored; `.env.example` holds placeholders only.
- If a key leaks, deactivate it in IAM immediately and create a new one.
- The IAM policy is scoped to one bucket; the keys cannot touch anything else in your account.
- Optional: add an S3 **Lifecycle rule** to abort incomplete multipart uploads after 1 day (housekeeping; Aether's own `pnpm cleanup` removes abandoned uploads).
