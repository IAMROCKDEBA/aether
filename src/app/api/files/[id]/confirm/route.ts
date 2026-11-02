import { confirmUpload } from "@/server/files";
import { json, NO_STORE, route } from "@/server/http";
import { requireApiUser } from "@/server/session";
import { fileIdParam } from "@/server/validation";

/** Step 2 of an upload: verify the object in S3 and publish the file. */
export const POST = route(async (_request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = fileIdParam.parse(await params);
  return json(await confirmUpload(user, id), { headers: NO_STORE });
});
