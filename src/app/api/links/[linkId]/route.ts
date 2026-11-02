import { z } from "zod";
import { json, NO_STORE, route } from "@/server/http";
import { revokeLink } from "@/server/links";
import { requireApiUser } from "@/server/session";

const paramsSchema = z.object({ linkId: z.string().min(1).max(64) });

/** Revokes a temporary link. It stops working immediately. */
export const DELETE = route(async (_request, { params }: { params: Promise<{ linkId: string }> }) => {
  const user = await requireApiUser();
  const { linkId } = paramsSchema.parse(await params);
  return json(await revokeLink(user, linkId), { headers: NO_STORE });
});
