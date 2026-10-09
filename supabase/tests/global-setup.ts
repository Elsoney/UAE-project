/**
 * Starts a throw-away PostgreSQL 17 server, applies the Supabase stand-in,
 * every migration in order and the seed, then hands the connection URL to the
 * tests. Set TEST_DATABASE_URL to use an existing EMPTY database instead.
 */
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import type { TestProject } from "vitest/node";

const supabaseDir = join(dirname(fileURLToPath(import.meta.url)), "..");

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
    /** Separate database for tests that must commit (concurrency); empty when TEST_DATABASE_URL is used. */
    concurrencyDatabaseUrl: string;
  }
}

export async function applySchema(url: string): Promise<void> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(await readFile(join(supabaseDir, "tests", "supabase-stub.sql"), "utf8"));
    const migrationsDir = join(supabaseDir, "migrations");
    const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      try {
        await client.query(await readFile(join(migrationsDir, file), "utf8"));
      } catch (error) {
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
      }
    }
    await client.query(await readFile(join(supabaseDir, "seed.sql"), "utf8"));
  } finally {
    await client.end();
  }
}

export default async function setup(project: TestProject) {
  let url = process.env.TEST_DATABASE_URL;
  let server: EmbeddedPostgres | undefined;
  let dataDir: string | undefined;

  if (!url) {
    dataDir = await mkdtemp(join(tmpdir(), "umodai-pg-"));
    const port = 55000 + Math.floor(Math.random() * 5000);
    server = new EmbeddedPostgres({
      databaseDir: dataDir,
      user: "postgres",
      password: "postgres",
      port,
      persistent: false,
      // Supabase databases are UTF-8; Arabic text needs it too.
      initdbFlags: ["--encoding=UTF8", "--locale=C.UTF-8"],
      // initdb refuses to run as root (e.g. in some containers)
      createPostgresUser: typeof process.getuid === "function" && process.getuid() === 0,
      onLog: () => {},
    });
    await server.initialise();
    await server.start();
    await server.createDatabase("umodai_test");
    url = `postgresql://postgres:postgres@localhost:${port}/umodai_test`;
  }

  await applySchema(url);
  project.provide("databaseUrl", url);

  let concurrencyUrl = "";
  if (server) {
    await server.createDatabase("umodai_concurrency");
    concurrencyUrl = url.replace(/\/umodai_test$/, "/umodai_concurrency");
    await applySchema(concurrencyUrl);
  }
  project.provide("concurrencyDatabaseUrl", concurrencyUrl);

  return async () => {
    await server?.stop();
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
  };
}
