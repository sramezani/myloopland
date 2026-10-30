import "server-only";
import { z } from "zod";

/**
 * Environment variables, checked with Zod. This is the only file that reads
 * `process.env`. Every variable is listed and explained in `.env.example`.
 *
 * - At server startup (instrumentation.ts), the whole set is checked, so a bad deploy fails fast.
 * - Reading `env.X` checks only X. A build therefore needs only what static pages read
 *   (APP_URL), not the runtime secrets.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().transform((url) => url.replace(/\/+$/, "")),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, "Use 32+ random characters (openssl rand -base64 48)"),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof schema>;
type Key = keyof Env;

/** Inlined by Next.js at build time, so it is safe to read without the other variables. */
export const isProduction = process.env.NODE_ENV === "production";

const isKey = (key: PropertyKey): key is Key => typeof key === "string" && key in schema.shape;

const values = new Map<Key, unknown>();

function read<K extends Key>(key: K): Env[K] {
  if (!values.has(key)) {
    const parsed = schema.shape[key].safeParse(process.env[key]);
    if (!parsed.success) {
      throw new Error(`Invalid environment variable ${key}:\n${z.prettifyError(parsed.error)}`);
    }
    values.set(key, parsed.data);
  }
  return values.get(key) as Env[K];
}

/** Checks every variable at once and returns them. */
export function getEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

/** Called from instrumentation.ts when the Node.js server starts (not during `next build`). */
export function checkEnvAtStartup() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  getEnv();
}

/** Typed, validated environment. Reading a key validates that key once. */
export const env: Env = new Proxy({} as Env, {
  get: (_target, key) => (isKey(key) ? read(key) : undefined),
  has: (_target, key) => isKey(key),
  ownKeys: () => Object.keys(schema.shape),
  getOwnPropertyDescriptor: (_target, key) =>
    isKey(key) ? { enumerable: true, configurable: true, value: read(key) } : undefined,
});
