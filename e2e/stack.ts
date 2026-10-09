/**
 * Starts a complete local stack for end-to-end tests, with no Docker and no
 * external services:
 *
 *   PostgreSQL 17 (embedded) + all migrations + seed
 *     -> PostgREST (Supabase's REST layer), JWT-authenticated
 *     -> a tiny proxy exposing it at /rest/v1 like Supabase does
 *     -> the production build of the Next.js app, configured to use it
 *
 * Requires the PostgREST binary: set POSTGREST_BIN (CI downloads it).
 * Real Supabase Auth, Storage and email are not part of this stack.
 */
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { createServer, request as httpRequest, type Server } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const JWT_SECRET = "e2e-only-jwt-secret-at-least-32-characters-long";

export function signJwt(payload: Record<string, unknown>): string {
  const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ iss: "supabase", iat: 1_700_000_000, exp: 4_100_000_000, ...payload })}`;
  return `${body}.${createHmac("sha256", JWT_SECRET).update(body).digest("base64url")}`;
}

export const anonKey = signJwt({ role: "anon" });
export const serviceKey = signJwt({ role: "service_role" });

async function applySchema(url: string) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(await readFile(join(root, "supabase/tests/supabase-stub.sql"), "utf8"));
    const dir = join(root, "supabase/migrations");
    for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
      await client.query(await readFile(join(dir, file), "utf8"));
    }
    await client.query(await readFile(join(root, "supabase/seed.sql"), "utf8"));
    // PostgREST connects as "authenticator" and switches to anon/authenticated/service_role per request.
    await client.query(`create role authenticator login password 'authenticator' noinherit;
                        grant anon, authenticated, service_role to authenticator;`);
  } finally {
    await client.end();
  }
}

function freePort(): number {
  return 40000 + Math.floor(Math.random() * 20000);
}

async function waitFor(url: string, timeoutMs = 60_000) {
  const started = Date.now();
  for (;;) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for ${url}`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

type AuthUser = { id: string; email: string; created_at: string };

function verifyJwt(token: string): Record<string, unknown> | null {
  const [h, p, sig] = token.split(".");
  if (!h || !p || !sig) return null;
  const expected = createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest("base64url");
  if (expected !== sig) return null;
  const payload = JSON.parse(Buffer.from(p, "base64url").toString()) as Record<string, unknown>;
  if (typeof payload.exp === "number" && payload.exp < Date.now() / 1000) return null;
  return payload;
}

function userJson(u: AuthUser) {
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: u.created_at,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: u.created_at,
    updated_at: u.created_at,
  };
}

function session(u: AuthUser) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: signJwt({ sub: u.id, role: "authenticated", aud: "authenticated", email: u.email, iat: now, exp: now + 3600 }),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: `rt-${u.id}`,
    user: userJson(u),
  };
}

/**
 * Minimal stand-in for Supabase Auth (GoTrue): password sign-in, refresh,
 * current user and sign-out — enough to test staff sign-in end to end.
 * Passwords are sha256 hashes in auth.users.encrypted_password (test only).
 */
async function handleAuth(databaseUrl: string, req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) {
  const url = new URL(req.url ?? "/", "http://local");
  const body = await new Promise<string>((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
  const send = (status: number, json?: unknown) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(json === undefined ? "" : JSON.stringify(json));
  };
  const db = new pg.Client({ connectionString: databaseUrl });
  await db.connect();
  try {
    const find = async (where: string, params: unknown[]) =>
      (await db.query<AuthUser>(`select id, email, created_at::text from auth.users where ${where}`, params)).rows[0];
    const path = url.pathname.replace(/^\/auth\/v1/, "");
    if (path === "/token" && req.method === "POST") {
      const input = JSON.parse(body || "{}") as { email?: string; password?: string; refresh_token?: string };
      let user: AuthUser | undefined;
      if (url.searchParams.get("grant_type") === "password") {
        user = await find("lower(email) = lower($1) and encrypted_password = encode(sha256(convert_to($2, 'UTF8')), 'hex')", [input.email, input.password]);
      } else if (url.searchParams.get("grant_type") === "refresh_token" && input.refresh_token?.startsWith("rt-")) {
        user = await find("id = $1::uuid", [input.refresh_token.slice(3)]);
      }
      if (!user) return send(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
      return send(200, session(user));
    }
    if (path === "/user" && req.method === "GET") {
      const claims = verifyJwt(String(req.headers.authorization ?? "").replace(/^Bearer /, ""));
      const user = claims?.sub ? await find("id = $1::uuid", [claims.sub]) : undefined;
      if (!user) return send(401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
      return send(200, userJson(user));
    }
    if (path === "/logout") return send(204);
    return send(404, { code: 404, msg: "not found" });
  } finally {
    await db.end();
  }
}

function proxy(targetPort: number, port: number, databaseUrl: string): Server {
  return createServer((req, res) => {
    if ((req.url ?? "").startsWith("/auth/v1/")) {
      handleAuth(databaseUrl, req, res).catch(() => {
        res.writeHead(500);
        res.end();
      });
      return;
    }
    const path = (req.url ?? "/").replace(/^\/rest\/v1/, "") || "/";
    const upstream = httpRequest(
      { host: "127.0.0.1", port: targetPort, path, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${targetPort}` } },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      },
    );
    upstream.on("error", () => {
      res.writeHead(502);
      res.end();
    });
    req.pipe(upstream);
  }).listen(port, "127.0.0.1");
}

export type Stack = { siteUrl: string; apiUrl: string; databaseUrl: string; stop: () => Promise<void> };

export async function startStack(): Promise<Stack> {
  const postgrestBin = process.env.POSTGREST_BIN;
  if (!postgrestBin || !existsSync(postgrestBin)) {
    throw new Error("Set POSTGREST_BIN to a PostgREST binary (see e2e/README.md).");
  }

  const dataDir = await mkdtemp(join(tmpdir(), "umodai-e2e-pg-"));
  const pgPort = freePort();
  const db = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port: pgPort,
    persistent: false,
    initdbFlags: ["--encoding=UTF8", "--locale=C.UTF-8"],
    createPostgresUser: typeof process.getuid === "function" && process.getuid() === 0,
    onLog: () => {},
  });
  await db.initialise();
  await db.start();
  await db.createDatabase("umodai");
  const databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${pgPort}/umodai`;
  await applySchema(databaseUrl);

  const children: ChildProcess[] = [];
  const restPort = freePort();
  children.push(
    spawn(postgrestBin, [], {
      env: {
        ...process.env,
        PGRST_DB_URI: `postgresql://authenticator:authenticator@127.0.0.1:${pgPort}/umodai`,
        PGRST_DB_SCHEMAS: "public",
        PGRST_DB_ANON_ROLE: "anon",
        PGRST_JWT_SECRET: JWT_SECRET,
        PGRST_SERVER_PORT: String(restPort),
        PGRST_SERVER_HOST: "127.0.0.1",
        PGRST_LOG_LEVEL: "error",
      },
      stdio: "inherit",
    }),
  );
  await waitFor(`http://127.0.0.1:${restPort}/`);

  const apiPort = freePort();
  const api = proxy(restPort, apiPort, databaseUrl);
  const apiUrl = `http://127.0.0.1:${apiPort}`;

  const sitePort = freePort();
  const siteUrl = `http://127.0.0.1:${sitePort}`;
  const frontend = join(root, "frontend");
  const env = {
    ...process.env,
    NEXT_PUBLIC_SITE_URL: siteUrl,
    NEXT_PUBLIC_SUPABASE_URL: apiUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    PAYMENT_PROVIDER: "mock",
    PAYMENT_WEBHOOK_SECRET: "e2e-webhook-secret-0123456789",
    APP_ENV: "test",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  // NEXT_PUBLIC_* values are inlined at build time, so build with this stack's settings.
  execFileSync("npx", ["next", "build"], { cwd: frontend, env, stdio: process.env.E2E_VERBOSE ? "inherit" : "ignore" });
  children.push(spawn("npx", ["next", "start", "-p", String(sitePort), "-H", "127.0.0.1"], { cwd: frontend, env, stdio: "ignore" }));
  await waitFor(`${siteUrl}/ar`);

  return {
    siteUrl,
    apiUrl,
    databaseUrl,
    async stop() {
      await Promise.all(
        children.map(
          (child) =>
            new Promise<void>((resolve) => {
              if (child.exitCode !== null) return resolve();
              child.once("exit", () => resolve());
              child.kill("SIGTERM");
              setTimeout(resolve, 5_000);
            }),
        ),
      );
      api.close();
      await db.stop();
      await rm(dataDir, { recursive: true, force: true });
    },
  };
}
