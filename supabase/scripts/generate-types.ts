/**
 * Generates frontend/src/types/database.ts from the migrations, in the same
 * shape as `supabase gen types typescript`, without needing a Supabase project:
 * it spins up a temporary PostgreSQL, applies the migrations and introspects.
 *
 *   cd supabase && npm run gen:types
 *
 * Once a Supabase project exists you may switch to `supabase gen types`.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { applySchema } from "../tests/global-setup.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outFile = join(here, "..", "..", "frontend", "src", "types", "database.ts");

type Column = {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
  is_identity: "YES" | "NO";
  is_generated: "ALWAYS" | "NEVER";
};

const scalar: Record<string, string> = {
  uuid: "string",
  text: "string",
  varchar: "string",
  bpchar: "string",
  date: "string",
  time: "string",
  timestamptz: "string",
  timestamp: "string",
  bool: "boolean",
  int2: "number",
  int4: "number",
  int8: "number",
  numeric: "number",
  float4: "number",
  float8: "number",
  jsonb: "Json",
  void: "undefined",
  json: "Json",
};

function tsType(udt: string, enums: Set<string>): string {
  if (udt.startsWith("_")) return `${tsType(udt.slice(1), enums)}[]`;
  if (enums.has(udt)) return `Database["public"]["Enums"]["${udt}"]`;
  const t = scalar[udt];
  if (!t) throw new Error(`No TypeScript mapping for Postgres type ${udt}`);
  return t;
}

async function introspect(url: string): Promise<string> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const enumRows = (
      await client.query<{ name: string; value: string }>(
        `select t.typname as name, e.enumlabel as value
           from pg_type t
           join pg_enum e on e.enumtypid = t.oid
           join pg_namespace n on n.oid = t.typnamespace
          where n.nspname = 'public'
          order by t.typname, e.enumsortorder`,
      )
    ).rows;
    const enums = new Map<string, string[]>();
    for (const r of enumRows) enums.set(r.name, [...(enums.get(r.name) ?? []), r.value]);
    const enumNames = new Set(enums.keys());

    const columns = (
      await client.query<Column>(
        `select c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable,
                c.column_default, c.is_identity, c.is_generated
           from information_schema.columns c
           join information_schema.tables t
             on t.table_schema = c.table_schema and t.table_name = c.table_name
          where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
          order by c.table_name, c.column_name`,
      )
    ).rows;

    const fks = (
      await client.query<{
        name: string;
        table_name: string;
        columns: string[];
        ref_table: string;
        ref_columns: string[];
        one_to_one: boolean;
      }>(
        `select con.conname as name,
                rel.relname as table_name,
                array(select a.attname from unnest(con.conkey) k join pg_attribute a
                        on a.attrelid = con.conrelid and a.attnum = k order by a.attname)::text[] as columns,
                frel.relname as ref_table,
                array(select a.attname from unnest(con.confkey) k join pg_attribute a
                        on a.attrelid = con.confrelid and a.attnum = k order by a.attname)::text[] as ref_columns,
                exists (
                  select 1 from pg_index i
                   where i.indrelid = con.conrelid and i.indisunique
                     and (i.indkey::int2[])::int2[] @> con.conkey and cardinality(con.conkey) = i.indnatts
                ) as one_to_one
           from pg_constraint con
           join pg_class rel on rel.oid = con.conrelid
           join pg_namespace n on n.oid = rel.relnamespace
           join pg_class frel on frel.oid = con.confrelid
           join pg_namespace fn on fn.oid = frel.relnamespace
          where con.contype = 'f' and n.nspname = 'public' and fn.nspname = 'public'
          order by rel.relname, con.conname`,
      )
    ).rows;

    const functions = (
      await client.query<{ name: string; args: string; returns: string; retset: boolean }>(
        `select p.proname as name,
                coalesce(pg_get_function_arguments(p.oid), '') as args,
                t.typname as returns,
                p.proretset as retset
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           join pg_type t on t.oid = p.prorettype
          where n.nspname = 'public'
            and t.typname <> 'trigger'
            and has_function_privilege('authenticated', p.oid, 'execute')
          order by p.proname`,
      )
    ).rows;

    const tables = [...new Set(columns.map((c) => c.table_name))];
    const out: string[] = [];
    const ind = (n: number) => "  ".repeat(n);

    out.push("/**");
    out.push(" * Database types for the Umodai Supabase schema.");
    out.push(" *");
    out.push(" * GENERATED FILE — do not edit by hand. Regenerate after every migration:");
    out.push(" *   cd supabase && npm run gen:types");
    out.push(" * (Shape matches `supabase gen types typescript`; money columns are AED fils.)");
    out.push(" */");
    out.push("");
    out.push("export type Json =");
    out.push("  | string");
    out.push("  | number");
    out.push("  | boolean");
    out.push("  | null");
    out.push("  | { [key: string]: Json | undefined }");
    out.push("  | Json[];");
    out.push("");
    out.push("export type Database = {");
    out.push(`${ind(1)}public: {`);
    out.push(`${ind(2)}Tables: {`);
    for (const table of tables) {
      const cols = columns.filter((c) => c.table_name === table);
      out.push(`${ind(3)}${table}: {`);
      out.push(`${ind(4)}Row: {`);
      for (const c of cols) {
        const t = tsType(c.udt_name, enumNames);
        out.push(`${ind(5)}${c.column_name}: ${t}${c.is_nullable === "YES" ? " | null" : ""};`);
      }
      out.push(`${ind(4)}};`);
      for (const kind of ["Insert", "Update"] as const) {
        out.push(`${ind(4)}${kind}: {`);
        for (const c of cols) {
          const t = tsType(c.udt_name, enumNames);
          const nullable = c.is_nullable === "YES" ? " | null" : "";
          if (c.is_generated === "ALWAYS" || c.is_identity === "YES") {
            out.push(`${ind(5)}${c.column_name}?: never;`);
            continue;
          }
          const optional =
            kind === "Update" || c.is_nullable === "YES" || c.column_default !== null;
          out.push(`${ind(5)}${c.column_name}${optional ? "?" : ""}: ${t}${nullable};`);
        }
        out.push(`${ind(4)}};`);
      }
      const rels = fks.filter((f) => f.table_name === table);
      if (rels.length === 0) {
        out.push(`${ind(4)}Relationships: [];`);
      } else {
        out.push(`${ind(4)}Relationships: [`);
        for (const f of rels) {
          out.push(`${ind(5)}{`);
          out.push(`${ind(6)}foreignKeyName: "${f.name}";`);
          out.push(`${ind(6)}columns: [${f.columns.map((c) => `"${c}"`).join(", ")}];`);
          out.push(`${ind(6)}isOneToOne: ${f.one_to_one};`);
          out.push(`${ind(6)}referencedRelation: "${f.ref_table}";`);
          out.push(`${ind(6)}referencedColumns: [${f.ref_columns.map((c) => `"${c}"`).join(", ")}];`);
          out.push(`${ind(5)}},`);
        }
        out.push(`${ind(4)}];`);
      }
      out.push(`${ind(3)}};`);
    }
    out.push(`${ind(2)}};`);
    out.push(`${ind(2)}Views: {`);
    out.push(`${ind(3)}[_ in never]: never;`);
    out.push(`${ind(2)}};`);
    out.push(`${ind(2)}Functions: {`);
    for (const f of functions) {
      const args = f.args
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
        .map((a) => {
          const [name, ...typeParts] = a.split(/\s+/);
          const typeName = typeParts.join(" ").replace(/^public\./, "");
          const udt =
            {
              text: "text",
              uuid: "uuid",
              date: "date",
              "timestamp with time zone": "timestamptz",
            }[typeName] ?? typeName;
          return `${name}: ${tsType(udt, enumNames)}`;
        });
      let ret = enumNames.has(f.returns) || scalar[f.returns] ? tsType(f.returns, enumNames) : null;
      if (ret === null) {
        ret = tables.includes(f.returns)
          ? `Database["public"]["Tables"]["${f.returns}"]["Row"]`
          : "unknown";
      }
      if (f.retset) ret = `${ret}[]`;
      out.push(`${ind(3)}${f.name}: {`);
      out.push(`${ind(4)}Args: ${args.length ? `{ ${args.join("; ")} }` : "Record<PropertyKey, never>"};`);
      out.push(`${ind(4)}Returns: ${ret};`);
      out.push(`${ind(3)}};`);
    }
    out.push(`${ind(2)}};`);
    out.push(`${ind(2)}Enums: {`);
    for (const [name, values] of enums) {
      out.push(`${ind(3)}${name}: ${values.map((v) => `"${v}"`).join(" | ")};`);
    }
    out.push(`${ind(2)}};`);
    out.push(`${ind(2)}CompositeTypes: {`);
    out.push(`${ind(3)}[_ in never]: never;`);
    out.push(`${ind(2)}};`);
    out.push(`${ind(1)}};`);
    out.push("};");
    out.push("");
    out.push('type PublicSchema = Database["public"];');
    out.push("");
    out.push('export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];');
    out.push(
      'export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];',
    );
    out.push(
      'export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];',
    );
    out.push('export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];');
    out.push("");
    out.push("export const Constants = {");
    out.push(`${ind(1)}public: {`);
    out.push(`${ind(2)}Enums: {`);
    for (const [name, values] of enums) {
      out.push(`${ind(3)}${name}: [${values.map((v) => `"${v}"`).join(", ")}],`);
    }
    out.push(`${ind(2)}},`);
    out.push(`${ind(1)}},`);
    out.push("} as const;");
    out.push("");
    return out.join("\n");
  } finally {
    await client.end();
  }
}

const dataDir = await mkdtemp(join(tmpdir(), "umodai-types-"));
const port = 55000 + Math.floor(Math.random() * 5000);
const server = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: false,
  initdbFlags: ["--encoding=UTF8", "--locale=C.UTF-8"],
  createPostgresUser: typeof process.getuid === "function" && process.getuid() === 0,
  onLog: () => {},
});
try {
  await server.initialise();
  await server.start();
  await server.createDatabase("umodai_types");
  const url = `postgresql://postgres:postgres@localhost:${port}/umodai_types`;
  await applySchema(url);
  await writeFile(outFile, await introspect(url));
  console.log(`Wrote ${outFile}`);
} finally {
  await server.stop();
  await rm(dataDir, { recursive: true, force: true });
}
