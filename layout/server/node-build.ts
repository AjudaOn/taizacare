import path from "path";
import * as express from "express";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load runtime env vars (Mercado Pago, Melhor Envio, PUBLIC_BASE_URL, etc.)
// In production we run `node dist/server/node-build.mjs`, so `.env` lives at `../../.env`.
dotenv.config({ path: path.join(__dirname, "../../.env") });

const { createServer } = await import("./index");
const app = createServer();
const port = process.env.PORT || 3000;

// In production, serve the built SPA files
const distPath = path.join(__dirname, "../spa");

// Serve static files
app.use(express.static(distPath));

// Handle React Router - serve index.html for all non-API routes
// Express 5 no longer accepts "*" as a path pattern (path-to-regexp).
app.get(/^\/(?!api\/|health).*$/, (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
