import { deleteFile, getFileDetail, updateFile } from "@/server/files";
import { json, NO_STORE, readJson, route } from "@/server/http";
import { requireApiUser } from "@/server/session";
import { fileIdParam, updateFileBody } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = fileIdParam.parse(await params);
  return json(await getFileDetail(user, id), { headers: NO_STORE });
});

export const PATCH = route(async (request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = fileIdParam.parse(await params);
  const patch = await readJson(request, updateFileBody);
  return json(await updateFile(user, id, patch), { headers: NO_STORE });
});

export const DELETE = route(async (_request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = fileIdParam.parse(await params);
  await deleteFile(user, id);
  return new Response(null, { status: 204 });
});
