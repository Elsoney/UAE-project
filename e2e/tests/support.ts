import { randomUUID } from "node:crypto";
import pg from "pg";

export const site = () => process.env.E2E_SITE_URL!;
export const api = () => process.env.E2E_API_URL!;

export async function query<T extends pg.QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: process.env.E2E_DATABASE_URL });
  await client.connect();
  try {
    return (await client.query<T>(sql, params)).rows;
  } finally {
    await client.end();
  }
}

export const uniqueEmail = (name: string) => `${name}-${randomUUID().slice(0, 8)}@example.com`;

/** A date safely beyond the 48-hour lead time, as YYYY-MM-DD. */
export function eventDate(daysAhead = 14): string {
  return new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
}
