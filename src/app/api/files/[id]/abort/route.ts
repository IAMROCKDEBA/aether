import { abortUpload } from "@/server/files";
import { route } from "@/server/http";
import { requireApiUser } from "@/server/session";
import { fileIdParam } from "@/server/validation";

/** Lets the client cancel an upload it started; frees the reserved quota. */
export const POST = route(async (_request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = fileIdParam.parse(await params);
  await abortUpload(user, id);
  return new Response(null, { status: 204 });
});
