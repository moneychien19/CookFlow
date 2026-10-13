import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { z } from "zod";
import * as schema from "./schema";

export type Db = NeonDatabase<typeof schema>;

const env = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
});

let db: Db | undefined;

/**
 * The app's database. Uses Neon's WebSocket Pool (not the HTTP driver) because
 * "mark cooked" needs an interactive transaction with SELECT ... FOR UPDATE.
 * Created on first use, so importing this module never needs DATABASE_URL.
 */
export function getDb(): Db {
  if (!db) {
    const { DATABASE_URL } = env.parse(process.env);
    db = drizzle({ client: new Pool({ connectionString: DATABASE_URL }), schema });
  }
  return db;
}
