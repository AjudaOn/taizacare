import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleShippingQuote } from "./routes/shipping-quote";
import { handleCheckout } from "./routes/checkout";
import { handleMercadoPagoWebhook } from "./routes/mp-webhook";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => res.status(200).send("ok"));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/shipping/quote", handleShippingQuote);
  app.post("/api/checkout", handleCheckout);
  app.post("/api/mp/webhook", handleMercadoPagoWebhook);

  return app;
}
