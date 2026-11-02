import { json, NO_STORE, readJson, route } from "@/server/http";
import { createLink } from "@/server/links";
import { requireApiUser } from "@/server/session";
import { createLinkBody, fileIdParam } from "@/server/validation";

export const POST = route(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = fileIdParam.parse(await params);
  const body = await readJson(request, createLinkBody);
  return json(await createLink(user, id, body), { status: 201, headers: NO_STORE });
});
