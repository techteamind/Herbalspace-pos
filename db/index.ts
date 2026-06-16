import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) throw new Error("POSTGRES_URL belum di-set");

// `prepare: false` direkomendasikan untuk koneksi pooled Vercel Postgres.
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
export { schema };
