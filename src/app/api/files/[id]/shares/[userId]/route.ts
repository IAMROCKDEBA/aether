import { z } from "zod";
import { removeShare } from "@/server/files";
import { route } from "@/server/http";
import { requireApiUser } from "@/server/session";

const paramsSchema = z.object({ id: z.string().min(1).max(64), userId: z.string().min(1).max(64) });

export const DELETE = route(async (_request, { params }: { params: Promise<{ id: string; userId: string }> }) => {
  const user = await requireApiUser();
  const { id, userId } = paramsSchema.parse(await params);
  await removeShare(user, id, userId);
  return new Response(null, { status: 204 });
});
