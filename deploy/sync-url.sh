#!/usr/bin/env bash
# Keeps Aether consistent with its Cloudflare quick-tunnel address.
#
# A quick tunnel gets a new https://<random>.trycloudflare.com URL every time it
# restarts. This script reads the current one from the tunnel's logs and, if it
# changed, updates APP_URL, the S3 bucket's CORS origins, and restarts only the
# Aether app container. Idempotent; run by aether-url-sync.timer.
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

url="$(docker compose logs --no-log-prefix tunnel 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1 || true)"
[[ -n "$url" ]] || { echo "tunnel URL not available yet"; exit 0; }

current="$(grep -E '^APP_URL=' .env | cut -d= -f2-)"
[[ "$url" == "$current" ]] && exit 0

echo "tunnel URL changed: ${current:-none} -> $url"
sed -i "s|^APP_URL=.*|APP_URL=${url}|" .env

# Allow browser uploads/previews from the new origin (plus the VM demo origin).
docker compose run --rm --no-deps -T -e ORIGIN="$url" --entrypoint node app -e '
  const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");
  const s3 = new S3Client({ region: process.env.S3_REGION, credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } });
  s3.send(new PutBucketCorsCommand({ Bucket: process.env.S3_BUCKET, CORSConfiguration: { CORSRules: [{
    AllowedOrigins: [process.env.ORIGIN, "http://localhost:3000"],
    AllowedMethods: ["GET", "HEAD", "POST"], AllowedHeaders: ["*"], ExposeHeaders: ["ETag"], MaxAgeSeconds: 3600 }] } }))
    .then(() => console.log("S3 CORS updated"), (e) => { console.error("CORS update failed:", e.name, e.message); process.exit(1); });'

docker compose up -d --no-deps app
echo "app restarted on $url"
