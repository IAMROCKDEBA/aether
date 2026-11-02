import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

function createClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL, max: 10 });
  return new PrismaClient({ adapter });
}

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { __aetherDb?: PrismaClient };

export const db = globalForDb.__aetherDb ?? createClient();

if (!env.isProduction) globalForDb.__aetherDb = db;
