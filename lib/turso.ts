import { createClient } from '@libsql/client';

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error('TURSO_DATABASE_URL is not set');
}

if (!process.env.TURSO_AUTH_TOKEN) {
  throw new Error('TURSO_AUTH_TOKEN is not set');
}

export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Helper function for type-safe queries
export async function query<T>(sql: string, args?: any[]): Promise<T[]> {
  const result = await turso.execute({ sql, args: args || [] });
  return result.rows as T[];
}

// Helper for single row
export async function queryOne<T>(sql: string, args?: any[]): Promise<T | null> {
  const results = await query<T>(sql, args);
  return results[0] || null;
}

// Helper for count queries
export async function queryCount(sql: string, args?: any[]): Promise<number> {
  const result = await turso.execute({ sql, args: args || [] });
  const row = result.rows[0] as any;
  return row?.count || 0;
}
