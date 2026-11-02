import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clientIp, HttpError } from "@/server/http";
import { resolveLinkContent, unlockCookieName } from "@/server/links";
import { intentQuery, tokenParam } from "@/server/validation";

/** Validates a temporary link and redirects to a 60-second presigned S3 URL. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const parsed = tokenParam.safeParse(await params);
  if (!parsed.success) return new NextResponse(null, { status: 404 });
  const { token } = parsed.data;
  const intent = intentQuery.parse(new URL(request.url).searchParams.get("intent"));
  const jar = await cookies();
  try {
    const url = await resolveLinkContent(
      token,
      intent,
      (linkId) => jar.get(unlockCookieName(linkId))?.value,
      clientIp(request),
    );
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.redirect(new URL(`/s/${token}`, request.url), { status: 303 });
    }
    throw error;
  }
}
