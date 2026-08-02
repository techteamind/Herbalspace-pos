import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

// Inisialisasi koneksi secara lazy agar import modul ini tidak melempar
// error saat cold-start (mis. di Vercel) sebelum env benar-benar dipakai.
let _db: PostgresJsDatabase<typeof schema> | null = null;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db;
  const connectionString = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("POSTGRES_URL belum di-set");
  // Serverless (Vercel) + Supabase pooler: `prepare: false` wajib untuk pooler,
  // dan `max: 1` mencegah tiap instance fungsi menahan banyak koneksi hingga kuota
  // pool habis (gejala: "Internal server error" saat beberapa kasir jual bersamaan).
  // Pakai transaction pooler (port 6543) di POSTGRES_URL — create_sale aman karena
  // pakai pg_advisory_xact_lock (transaction-scoped). ponytail: max:1 aman untuk
  // serverless; naikkan jika handler paralel (mis. dashboard) terasa lambat.
  const client = postgres(connectionString, { prepare: false, max: 1, idle_timeout: 20 });
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
