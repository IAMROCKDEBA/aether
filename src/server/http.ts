import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "./env";

export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "payload_too_large"
  | "unprocessable"
  | "rate_limited"
  | "internal";

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  unprocessable: 422,
  rate_limited: 429,
  internal: 500,
};

/** An expected, user-facing failure. Anything else is treated as a 500. */
export class HttpError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly headers?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = () => new HttpError("not_found", "This file doesn't exist or you don't have access to it.");

function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: STATUS[error.code], headers: error.headers },
    );
  }
  if (error instanceof z.ZodError) {
    const first = error.issues[0];
    return NextResponse.json(
      { error: { code: "bad_request", message: first ? first.message : "Invalid request." } },
      { status: 400 },
    );
  }
  console.error("[aether] unhandled route error", error);
  return NextResponse.json(
    { error: { code: "internal", message: "Something went wrong on our side. Please try again." } },
    { status: 500 },
  );
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Defence in depth on top of SameSite cookies: state-changing requests must come
 * from our own origin.
 */
function assertSameOrigin(request: Request) {
  if (!MUTATING.has(request.method)) return;
  const origin = request.headers.get("origin");
  if (origin) {
    if (origin !== env.APP_URL) throw new HttpError("forbidden", "Cross-origin request blocked.");
    return;
  }
  if (request.headers.get("sec-fetch-site") !== "same-origin") {
    throw new HttpError("forbidden", "Cross-origin request blocked.");
  }
}

type Handler<C> = (request: Request, context: C) => Promise<Response>;

/** Wraps a route handler with origin checks and uniform JSON error handling. */
export function route<C>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      assertSameOrigin(request);
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError("bad_request", "Request body must be valid JSON.");
  }
  return schema.parse(body);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export const json = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);

/** Never let intermediaries cache per-user or signed responses. */
export const NO_STORE = { "Cache-Control": "private, no-store" } as const;
