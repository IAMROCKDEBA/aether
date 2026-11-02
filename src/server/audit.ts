import "server-only";
import type { AccessAction, AccessChannel } from "@/generated/prisma/enums";
import { hashIp } from "./access/tokens";
import { db } from "./db";
import { env } from "./env";

const VIEW_DEDUPE_MS = 10 * 60 * 1000;

type AccessRecord = {
  fileId: string;
  action: AccessAction;
  channel: AccessChannel;
  actorUserId?: string | null;
  linkId?: string | null;
  ip: string;
};

/**
 * Records non-owner access for the owner's activity feed. Repeated previews by
 * the same visitor within 10 minutes collapse into one entry. Logging never
 * blocks or fails the access itself.
 */
export async function recordAccess({ fileId, action, channel, actorUserId = null, linkId = null, ip }: AccessRecord) {
  try {
    const ipHash = hashIp(ip, env.BETTER_AUTH_SECRET);
    if (action === "VIEW") {
      const recent = await db.accessEvent.findFirst({
        where: {
          fileId,
          action,
          channel,
          linkId,
          ...(actorUserId ? { actorUserId } : { ipHash }),
          at: { gt: new Date(Date.now() - VIEW_DEDUPE_MS) },
        },
        select: { id: true },
      });
      if (recent) return;
    }
    await db.accessEvent.create({ data: { fileId, action, channel, actorUserId, linkId, ipHash } });
  } catch (error) {
    console.error("[aether] failed to record access event", error);
  }
}
