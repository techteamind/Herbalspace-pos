import { defineConfig } from "drizzle-kit";

// Migrasi & DDL pakai koneksi NON-POOLING (langsung), sesuai rekomendasi Neon.
// Fallback ke POSTGRES_URL bila non-pooling tidak tersedia.
const migrationUrl =
  process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL ?? "";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: migrationUrl },
  strict: true,
  verbose: true,
});
