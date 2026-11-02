import { listSharedWithMe } from "@/server/files";
import { json, NO_STORE, route } from "@/server/http";
import { requireApiUser } from "@/server/session";

export const GET = route(async () => {
  const user = await requireApiUser();
  return json({ files: await listSharedWithMe(user) }, { headers: NO_STORE });
});
