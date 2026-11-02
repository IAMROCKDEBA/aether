import { Landing } from "@/components/landing/landing";
import { getCurrentUser } from "@/server/session";

export default async function HomePage() {
  const user = await getCurrentUser();
  return <Landing signedIn={Boolean(user)} />;
}
