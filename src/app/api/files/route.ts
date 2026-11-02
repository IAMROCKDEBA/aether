import { listFiles } from "@/server/files";
import { json, NO_STORE, route } from "@/server/http";
import { requireApiUser } from "@/server/session";
import { listQuery } from "@/server/validation";

export const GET = route(async (request) => {
  const user = await requireApiUser();
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const page = await listFiles(user, listQuery.parse(params));
  return json(page, { headers: NO_STORE });
});
