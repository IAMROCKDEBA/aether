import type { Metadata } from "next";
import { VaultView } from "@/components/files/vault-view";
import { listFiles } from "@/server/files";
import { requirePageUser } from "@/server/session";

export const metadata: Metadata = { title: "My vault" };

export default async function FilesPage() {
  const user = await requirePageUser("/files");
  const initial = await listFiles(user, { sort: "newest", limit: 48 });
  return <VaultView initial={initial} />;
}
