import { Ban, CircleSlash, Clock3, EyeOff, LinkIcon } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { LinkOpen, UnlockForm } from "@/components/viewer/link-client";
import { StateCard, ViewerFrame } from "@/components/viewer/viewer-frame";
import { getLinkPageState, unlockCookieName, type LinkPageState } from "@/server/links";

// The token is a bearer secret: keep it out of Referer headers and search indexes.
export const metadata: Metadata = { title: "Shared link", referrer: "no-referrer", robots: { index: false } };

const DENIED: Record<Extract<LinkPageState, { kind: "denied" }>["reason"] | "missing", { icon: ReactNode; title: ReactNode; body: string; tone: "neutral" | "warn" | "danger" }> = {
  expired: {
    icon: <Clock3 className="size-7" strokeWidth={1.5} />,
    title: <>This link has <em>expired</em></>,
    body: "Temporary links stop working at the time their owner chose. Ask them for a new one.",
    tone: "warn",
  },
  revoked: {
    icon: <Ban className="size-7" strokeWidth={1.5} />,
    title: <>This link was <em>revoked</em></>,
    body: "The owner switched this link off. It no longer gives access to the file.",
    tone: "danger",
  },
  exhausted: {
    icon: <CircleSlash className="size-7" strokeWidth={1.5} />,
    title: <>Download limit <em>reached</em></>,
    body: "This link allowed a fixed number of downloads, and they've all been used.",
    tone: "warn",
  },
  paused: {
    icon: <EyeOff className="size-7" strokeWidth={1.5} />,
    title: <>This file is now <em>private</em></>,
    body: "The owner made the file private, so every shared link is paused.",
    tone: "neutral",
  },
  unavailable: {
    icon: <LinkIcon className="size-7" strokeWidth={1.5} />,
    title: <>Not <em>available</em></>,
    body: "This file isn't available right now.",
    tone: "neutral",
  },
  missing: {
    icon: <LinkIcon className="size-7" strokeWidth={1.5} />,
    title: <>Link not <em>found</em></>,
    body: "Check that you copied the whole address. The file may also have been deleted.",
    tone: "neutral",
  },
};

export default async function LinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const jar = await cookies();
  const state = await getLinkPageState(token, (linkId) => jar.get(unlockCookieName(linkId))?.value);

  if (state.kind === "missing" || state.kind === "denied") {
    const copy = DENIED[state.kind === "missing" ? "missing" : state.reason];
    return (
      <ViewerFrame>
        <StateCard icon={copy.icon} title={copy.title} tone={copy.tone}>
          {copy.body}
        </StateCard>
      </ViewerFrame>
    );
  }

  if (state.kind === "locked") {
    return (
      <ViewerFrame>
        <UnlockForm token={token} expiresAt={state.expiresAt} />
      </ViewerFrame>
    );
  }

  return (
    <ViewerFrame>
      <LinkOpen token={token} state={state} />
    </ViewerFrame>
  );
}
