import type { Metadata } from "next";
import { SharedView } from "@/components/files/shared-view";
import { listSharedWithMe } from "@/server/files";
import { requirePageUser } from "@/server/session";

export const metadata: Metadata = { title: "Shared with me" };

export default async function SharedPage() {
  const user = await requirePageUser("/shared");
  const files = await listSharedWithMe(user);
  return <SharedView files={files} />;
}
