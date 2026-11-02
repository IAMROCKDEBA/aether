import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { env } from "@/server/env";
import { getUsage } from "@/server/files";
import { requirePageUser } from "@/server/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requirePageUser();
  const usage = await getUsage(user.id);
  return (
    <AppShell user={{ name: user.name, email: user.email }} usage={usage} maxFileSize={env.maxFileSize}>
      {children}
    </AppShell>
  );
}
