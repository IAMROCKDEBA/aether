import { cookies } from "next/headers";
import { env } from "@/server/env";
import { clientIp, readJson, route } from "@/server/http";
import { unlockLink } from "@/server/links";
import { tokenParam, unlockBody } from "@/server/validation";

export const POST = route(async (request, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = tokenParam.parse(await params);
  const { password } = await readJson(request, unlockBody);
  const cookie = await unlockLink(token, password, clientIp(request));
  (await cookies()).set(cookie.name, cookie.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.secureCookies,
    path: "/",
    maxAge: cookie.maxAge,
  });
  return new Response(null, { status: 204 });
});
