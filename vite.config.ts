import { defineConfig, type PluginOption, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import dotenv from "dotenv";

// Muat env server (var non-VITE) agar handler api/* punya POSTGRES_URL & SUPABASE_JWT_SECRET.
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, ".env.local"), override: false });

/**
 * Menjalankan serverless function di folder `api/` (gaya Vercel) langsung di
 * dalam Vite dev server, sehingga `npm run dev` memberikan endpoint `/api/*`
 * yang fungsional — sama seperti saat di-deploy ke Vercel.
 */
function localApi(): PluginOption {
  return {
    name: "herbaspace-local-api",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();

        const reqUrl = new URL(req.url, "http://localhost");
        const name = reqUrl.pathname.replace(/^\/api\//, "").split("/")[0];
        if (!name) return next();

        const handlerPath = path.resolve(__dirname, `api/_handlers/${name}.ts`);
        const legacyPath = path.resolve(__dirname, `api/${name}.ts`);
        const modPath = fs.existsSync(handlerPath) ? handlerPath : legacyPath;
        if (!fs.existsSync(modPath)) return next();

        // Query params
        const query: Record<string, string> = {};
        reqUrl.searchParams.forEach((value, key) => {
          query[key] = value;
        });

        // Body JSON
        let body: unknown;
        if (req.method && req.method !== "GET" && req.method !== "HEAD") {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const raw = Buffer.concat(chunks).toString("utf8");
          if (raw) {
            try {
              body = JSON.parse(raw);
            } catch {
              body = raw;
            }
          }
        }

        // Shim req/res agar kompatibel dengan signature VercelRequest/VercelResponse.
        const vreq = req as IncomingMessage & { query: unknown; body: unknown };
        vreq.query = query;
        vreq.body = body;

        const vres = res as ServerResponse & {
          status: (code: number) => typeof vres;
          json: (data: unknown) => typeof vres;
          send: (data: unknown) => typeof vres;
        };
        vres.status = (code: number) => {
          res.statusCode = code;
          return vres;
        };
        vres.json = (data: unknown) => {
          if (!res.headersSent) res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(data));
          return vres;
        };
        vres.send = (data: unknown) => {
          res.end(typeof data === "string" ? data : JSON.stringify(data));
          return vres;
        };

        try {
          const ssrPath = fs.existsSync(handlerPath) ? `/api/_handlers/${name}.ts` : `/api/${name}.ts`;
          const mod = await server.ssrLoadModule(ssrPath);
          const handler = mod.default as
            | ((q: unknown, s: unknown) => unknown | Promise<unknown>)
            | undefined;
          if (typeof handler !== "function") {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: `Handler /api/${name} tidak valid` }));
            return;
          }
          await handler(vreq, vres);
          if (!res.writableEnded) res.end();
        } catch (err) {
          server.ssrFixStacktrace(err as Error);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({ error: err instanceof Error ? err.message : "API error" }),
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    localApi(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts", expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 } },
          },
          {
            urlPattern: /\/api\//,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache", expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 } },
          },
        ],
      },
      manifest: false,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@db": path.resolve(__dirname, "./db"),
    },
  },
  server: { port: Number(process.env.PORT) || 5173 },
});
