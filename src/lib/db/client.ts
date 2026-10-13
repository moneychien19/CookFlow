import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { z } from "zod";
import * as schema from "./schema";

export type Db = NeonDatabase<typeof schema> & { $client: Pool };

const postgresUrl = z.url({ protocol: /^postgres(ql)?$/ });

/**
 * A database on Neon's WebSocket Pool (not the HTTP driver), because "mark
 * cooked" needs an interactive transaction with SELECT ... FOR UPDATE.
 * Scripts and tests that create one should `await db.$client.end()` when done.
 */
export function createDb(url: string): Db {
  return drizzle({ client: new Pool({ connectionString: postgresUrl.parse(url) }), schema });
}

let db: Db | undefined;

/** The app's database, from DATABASE_URL. Created on first use, so importing this module needs no env. */
export function getDb(): Db {
  db ??= createDb(z.object({ DATABASE_URL: postgresUrl }).parse(process.env).DATABASE_URL);
  return db;
}
