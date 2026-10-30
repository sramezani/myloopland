import "server-only";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { brand } from "@/config/theme";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { env, isProduction } from "@/lib/env";
import { lazyObject } from "@/lib/lazy";
import { mcpResourceUrl } from "./mcp-resource";

const DAY = 60 * 60 * 24;

/**
 * Better Auth (docs/SPEC.md section 7): Google sign-in for people, and the OAuth server that
 * lets each user's Claude connect to /mcp. Only the basic sign-in scopes are asked from Google.
 */
const createAuth = () =>
  betterAuth({
    appName: brand.name,
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: "select_account",
      },
    },
    user: {
      // The X profile (the app's one input) and the browser's time zone. Never set by sign-up.
      additionalFields: {
        xHandle: { type: "string", required: false, input: false },
        timeZone: { type: "string", required: false, defaultValue: "UTC", input: false },
      },
    },
    session: {
      expiresIn: 30 * DAY,
      updateAge: DAY,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    advanced: {
      useSecureCookies: env.APP_URL.startsWith("https://"),
      // Behind Cloudflare: rate limits key on the visitor's address, not Cloudflare's.
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
    },
    plugins: [
      // Signs Claude's access tokens and serves /api/auth/jwks, which /mcp checks them against.
      jwt(),
      // The OAuth 2.1 server for MCP clients. It is the OAuth provider: no oauthProvider() too.
      mcp({
        loginPage: "/signin",
        consentPage: "/consent",
        resource: mcpResourceUrl(env.APP_URL),
        scopes: ["openid", "profile", "email", "offline_access"],
        // Scheduled tasks run unattended, so a connection should outlast a quiet month.
        refreshTokenExpiresIn: 90 * DAY,
        // Every Claude app refreshes its tokens from Anthropic's servers: one address for all users.
        rateLimit: { token: { window: 60, max: 600 } },
        // Claude identifies itself with its published metadata (CIMD, below). Self-registration
        // is deprecated by the MCP spec: only on in development, for MCP Inspector.
        allowDynamicClientRegistration: !isProduction,
        allowUnauthenticatedClientRegistration: !isProduction,
        clientRegistrationDefaultApplicationType: "infer",
      }),
      cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
      nextCookies(),
    ],
  });

/** The Better Auth instance, created on first use. */
export const auth: ReturnType<typeof createAuth> = lazyObject(createAuth);
