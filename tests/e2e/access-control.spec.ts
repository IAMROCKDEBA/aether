import "dotenv/config";
import { expect, request as playwrightRequest, test, type APIRequestContext } from "@playwright/test";
import { Client } from "pg";
import { FRIEND, LINK_PASSWORD, OWNER } from "./fixtures";

/**
 * End-to-end proof of the permission model against the real stack
 * (Next.js + Postgres + S3-compatible storage). Each run uses fresh accounts.
 */

const run = Date.now().toString(36);
const owner = { ...OWNER, email: OWNER.email.replace("@", `+${run}@`) };
const friend = { ...FRIEND, email: FRIEND.email.replace("@", `+${run}@`) };
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

let ownerApi: APIRequestContext;
let friendApi: APIRequestContext;
let anonApi: APIRequestContext;
let fileId: string;
const CONTENT = "Aether end-to-end secret payload\n";

const ctx = () => playwrightRequest.newContext({ baseURL: BASE, extraHTTPHeaders: { Origin: BASE } });

async function signUp(api: APIRequestContext, user: typeof OWNER) {
  const res = await api.post("/api/auth/sign-up/email", { data: { name: user.name, email: user.email, password: user.password } });
  expect(res.status(), await res.text()).toBe(200);
}

async function upload(api: APIRequestContext, name: string, body: string, type = "text/plain") {
  const presign = await api.post("/api/files/uploads", { data: { name, size: Buffer.byteLength(body), mimeType: type } });
  expect(presign.status()).toBe(201);
  const { fileId, upload } = await presign.json();
  const s3 = await api.post(upload.url, {
    headers: { Origin: "" },
    multipart: { ...upload.fields, file: { name, mimeType: type, buffer: Buffer.from(body) } },
  });
  expect(s3.status(), await s3.text()).toBeLessThan(300);
  const confirm = await api.post(`/api/files/${fileId}/confirm`);
  expect(confirm.status()).toBe(200);
  return fileId as string;
}

/** Returns the presigned S3 URL if access is granted, or null if the app refused. */
async function resolve(api: APIRequestContext, path: string): Promise<string | null> {
  const res = await api.get(path, { maxRedirects: 0 });
  if (res.status() === 302) return res.headers()["location"]!;
  expect(res.status()).toBe(303); // refusal → friendly page
  return null;
}

async function setVisibility(visibility: string) {
  const res = await ownerApi.patch(`/api/files/${fileId}`, { data: { visibility } });
  expect(res.status()).toBe(200);
}

async function createLink(data: Record<string, unknown>) {
  const res = await ownerApi.post(`/api/files/${fileId}/links`, { data });
  expect(res.status(), await res.text()).toBe(201);
  const link = await res.json();
  return { id: link.id as string, token: (link.url as string).split("/s/")[1]! };
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  [ownerApi, friendApi, anonApi] = await Promise.all([ctx(), ctx(), ctx()]);
  await signUp(ownerApi, owner);
  await signUp(friendApi, friend);
  fileId = await upload(ownerApi, "secret.txt", CONTENT);
});

test.afterAll(async () => {
  await Promise.all([ownerApi?.dispose(), friendApi?.dispose(), anonApi?.dispose()]);
});

test("uploads start private: only the owner can open them", async () => {
  const url = await resolve(ownerApi, `/api/files/${fileId}/content?disposition=attachment`);
  expect(url).toBeTruthy();
  const body = await (await anonApi.get(url!)).text();
  expect(body).toBe(CONTENT);
  expect(await resolve(friendApi, `/api/files/${fileId}/content`)).toBeNull();
  expect(await resolve(anonApi, `/api/files/${fileId}/content`)).toBeNull();
});

test("the bucket itself is never publicly readable", async () => {
  const url = new URL((await resolve(ownerApi, `/api/files/${fileId}/content`))!);
  const unsigned = await anonApi.get(`${url.origin}${url.pathname}`);
  expect(unsigned.status()).toBe(403);
});

test("S3 rejects bodies that differ from the authorised size", async () => {
  const presign = await ownerApi.post("/api/files/uploads", { data: { name: "liar.txt", size: 4, mimeType: "text/plain" } });
  const { fileId: id, upload } = await presign.json();
  const s3 = await ownerApi.post(upload.url, {
    headers: { Origin: "" },
    multipart: { ...upload.fields, file: { name: "liar.txt", mimeType: "text/plain", buffer: Buffer.from("much longer than four") } },
  });
  expect(s3.status()).toBeGreaterThanOrEqual(400);
  expect((await ownerApi.post(`/api/files/${id}/confirm`)).status()).toBe(409);
  await ownerApi.post(`/api/files/${id}/abort`);
});

test("oversized uploads are refused before reaching storage", async () => {
  const res = await ownerApi.post("/api/files/uploads", { data: { name: "huge.bin", size: 10 * 1024 ** 3 } });
  expect(res.status()).toBe(413);
});

test("only the owner can change or delete a file", async () => {
  expect((await friendApi.patch(`/api/files/${fileId}`, { data: { visibility: "PUBLIC" } })).status()).toBe(404);
  expect((await friendApi.delete(`/api/files/${fileId}`)).status()).toBe(404);
  expect((await anonApi.patch(`/api/files/${fileId}`, { data: { visibility: "PUBLIC" } })).status()).toBe(401);
});

test("cross-origin mutations are blocked", async () => {
  const res = await ownerApi.patch(`/api/files/${fileId}`, { data: { visibility: "PUBLIC" }, headers: { Origin: "https://evil.example" } });
  expect(res.status()).toBe(403);
});

test("public files open for anyone, without signing in", async () => {
  await setVisibility("PUBLIC");
  const url = await resolve(anonApi, `/api/files/${fileId}/content?disposition=inline`);
  expect(await (await anonApi.get(url!)).text()).toBe(CONTENT);
  expect(await resolve(friendApi, `/api/files/${fileId}/content`)).toBeTruthy();
});

test("restricted files open only for invited people", async () => {
  await setVisibility("RESTRICTED");
  expect(await resolve(friendApi, `/api/files/${fileId}/content`)).toBeNull();

  const invite = await ownerApi.post(`/api/files/${fileId}/shares`, { data: { email: friend.email } });
  expect(invite.status()).toBe(201);
  expect(await resolve(friendApi, `/api/files/${fileId}/content`)).toBeTruthy();
  expect(await resolve(anonApi, `/api/files/${fileId}/content`)).toBeNull();

  const shared = await (await friendApi.get("/api/shared")).json();
  expect(shared.files.map((f: { id: string }) => f.id)).toContain(fileId);
});

test("password + download-limited link: locked, then exactly one download", async () => {
  const { token } = await createLink({ ttlSeconds: 3600, password: LINK_PASSWORD, maxDownloads: 1, label: "e2e" });
  const visitor = await ctx();
  try {
    expect(await resolve(visitor, `/api/s/${token}/content?intent=download`)).toBeNull();
    expect((await visitor.post(`/api/s/${token}/unlock`, { data: { password: "nope" } })).status()).toBe(401);
    expect((await visitor.post(`/api/s/${token}/unlock`, { data: { password: LINK_PASSWORD } })).status()).toBe(204);

    // Limited links are download-only.
    expect(await resolve(visitor, `/api/s/${token}/content?intent=view`)).toBeNull();
    const url = await resolve(visitor, `/api/s/${token}/content?intent=download`);
    expect(await (await visitor.get(url!)).text()).toBe(CONTENT);
    expect(await resolve(visitor, `/api/s/${token}/content?intent=download`)).toBeNull();
  } finally {
    await visitor.dispose();
  }
});

test("revoking a link kills it immediately", async () => {
  const { id, token } = await createLink({ ttlSeconds: 3600 });
  expect(await resolve(anonApi, `/api/s/${token}/content`)).toBeTruthy();
  expect((await ownerApi.delete(`/api/links/${id}`)).status()).toBe(200);
  expect(await resolve(anonApi, `/api/s/${token}/content`)).toBeNull();
});

test("expired links stop working", async () => {
  const { id, token } = await createLink({ ttlSeconds: 3600 });
  expect(await resolve(anonApi, `/api/s/${token}/content`)).toBeTruthy();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query(`UPDATE share_link SET "expiresAt" = NOW() - interval '1 second' WHERE id = $1`, [id]);
  await db.end();
  expect(await resolve(anonApi, `/api/s/${token}/content`)).toBeNull();
});

test("making a file private pauses every invitation and link", async () => {
  const { token } = await createLink({ ttlSeconds: 3600 });
  expect(await resolve(anonApi, `/api/s/${token}/content`)).toBeTruthy();
  await setVisibility("PRIVATE");
  expect(await resolve(anonApi, `/api/s/${token}/content`)).toBeNull();
  expect(await resolve(friendApi, `/api/files/${fileId}/content`)).toBeNull();
  const shared = await (await friendApi.get("/api/shared")).json();
  expect(shared.files).toHaveLength(0);
});

test("unguessable tokens: malformed or unknown links reveal nothing", async () => {
  expect(await resolve(anonApi, `/api/s/${"A".repeat(43)}/content`)).toBeNull();
  expect((await anonApi.get(`/api/s/not-a-token/content`, { maxRedirects: 0 })).status()).toBe(303);
});

test("deleting a file removes it from storage", async () => {
  const url = await resolve(ownerApi, `/api/files/${fileId}/content`);
  expect((await ownerApi.delete(`/api/files/${fileId}`)).status()).toBe(204);
  expect((await anonApi.get(url!)).status()).toBe(404);
  expect(await resolve(ownerApi, `/api/files/${fileId}/content`)).toBeNull();
});
