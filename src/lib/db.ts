import "server-only";
import pg from "pg";

// `date` como string ISO (YYYY-MM-DD), sin que pg lo convierta a Date con zona horaria.
pg.types.setTypeParser(1082, (v) => v);

const globalForPg = globalThis as unknown as { __algoLindoPool?: pg.Pool };

export function pool(): pg.Pool {
  if (!globalForPg.__algoLindoPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("Falta DATABASE_URL");
    globalForPg.__algoLindoPool = new pg.Pool({ connectionString, max: Number(process.env.PG_POOL_MAX ?? 10) });
  }
  return globalForPg.__algoLindoPool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await pool().query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export type Db = pg.PoolClient;

export async function tx<T>(fn: (client: Db) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

let anonRoleUnavailable = false;

/**
 * Corre consultas públicas con el rol `anon`, así las políticas RLS aplican
 * igual que si se usara la anon key de Supabase. Si el usuario de la conexión
 * no puede asumir `anon`, cae a la conexión normal (las consultas públicas
 * igual filtran por is_published).
 */
export async function asAnon<T>(fn: (client: Db) => Promise<T>): Promise<T> {
  if (anonRoleUnavailable) return tx(fn);
  try {
    return await tx(async (client) => {
      await client.query("set local role anon");
      return fn(client);
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "42501" && /role|set role/i.test((err as Error).message)) {
      anonRoleUnavailable = true;
      console.warn("[db] No se pudo asumir el rol anon; las lecturas públicas usan la conexión del servidor.");
      return tx(fn);
    }
    throw err;
  }
}
