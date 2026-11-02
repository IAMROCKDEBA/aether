import { NextResponse } from "next/server";
import { resolveFileContent } from "@/server/files";
import { clientIp, HttpError } from "@/server/http";
import { getCurrentUser } from "@/server/session";
import { dispositionQuery, fileIdParam } from "@/server/validation";

/**
 * Authorises access (owner, invited user or public) and redirects to a
 * short-lived presigned S3 URL. The bucket itself is never public.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = fileIdParam.safeParse(await params);
  if (!parsed.success) return new NextResponse(null, { status: 404 });
  const { id } = parsed.data;
  const disposition = dispositionQuery.parse(new URL(request.url).searchParams.get("disposition"));
  try {
    const user = await getCurrentUser();
    const url = await resolveFileContent(user?.id ?? null, id, disposition, clientIp(request));
    return NextResponse.redirect(url, {
      status: 302,
      headers: {
        "Cache-Control": disposition === "inline" ? "private, max-age=240" : "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.redirect(new URL(`/f/${id}`, request.url), { status: 303 });
    }
    throw error;
  }
}
