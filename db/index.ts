import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Inisialisasi koneksi secara lazy agar import modul ini tidak melempar
// error saat cold-start (mis. di Vercel) sebelum env benar-benar dipakai.
let _db: PostgresJsDatabase<typeof schema> | null = null;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db;
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("POSTGRES_URL belum di-set");
  // `prepare: false` direkomendasikan untuk koneksi pooled Vercel Postgres.
  const client = postgres(connectionString, { prepare: false });
  _db = drizzle(client, { schema });
  return _db;
}

// Proxy meneruskan setiap akses properti ke instance drizzle yang
// diinisialisasi saat pertama kali dipakai.
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance as object, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
