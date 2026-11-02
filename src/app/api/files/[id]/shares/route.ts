import { addShare } from "@/server/files";
import { json, NO_STORE, readJson, route } from "@/server/http";
import { requireApiUser } from "@/server/session";
import { addShareBody, fileIdParam } from "@/server/validation";

export const POST = route(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = fileIdParam.parse(await params);
  const { email } = await readJson(request, addShareBody);
  return json(await addShare(user, id, email), { status: 201, headers: NO_STORE });
});
