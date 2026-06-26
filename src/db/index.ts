import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error(`DATABASE_URL is not set (NODE_ENV=${process.env.NODE_ENV})`);
  return drizzle(neon(url), { schema });
}

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    return createDb()[prop as keyof ReturnType<typeof createDb>];
  },
});
