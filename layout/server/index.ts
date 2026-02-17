import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleShippingQuote } from "./routes/shipping-quote";
import { handleAddressLookup } from "./routes/address-lookup";
import { handleCheckout } from "./routes/checkout";
import { handleMercadoPagoWebhook } from "./routes/mp-webhook";
import { handleAdminOrders } from "./routes/admin-orders";
import { handleAdminN8nTestPaid } from "./routes/admin-n8n-test";
import { handleAdminStockGet, handleAdminStockUpdate } from "./routes/admin-stock";

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
  app.get("/api/address/lookup", handleAddressLookup);
  app.post("/api/checkout", handleCheckout);
  app.post("/api/mp/webhook", handleMercadoPagoWebhook);
  app.get("/api/admin/orders", handleAdminOrders);
  app.post("/api/admin/n8n/test-paid", handleAdminN8nTestPaid);
  app.get("/api/admin/stock", handleAdminStockGet);
  app.post("/api/admin/stock", handleAdminStockUpdate);

  return app;
}
