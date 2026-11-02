import { createUpload } from "@/server/files";
import { json, NO_STORE, readJson, route } from "@/server/http";
import { requireApiUser } from "@/server/session";
import { createUploadBody } from "@/server/validation";

/** Step 1 of an upload: reserve quota and get a presigned S3 POST policy. */
export const POST = route(async (request) => {
  const user = await requireApiUser();
  const body = await readJson(request, createUploadBody);
  return json(await createUpload(user, body), { status: 201, headers: NO_STORE });
});
