import { RequestHandler } from "express";
import crypto from "crypto";
import { env } from "../config";
import { listStockLevels, setStockLevels, type StockSize } from "../db";

const validSizes: StockSize[] = ["PP", "P", "M", "G", "GG"];

function timingSafeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isAuthorized(req: Parameters<RequestHandler>[0]) {
  if (!env.adminToken) return false;
  const header = req.header("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) return false;
  return timingSafeEqual(match[1], env.adminToken);
}

export const handleAdminStockGet: RequestHandler = (_req, res) => {
  if (!isAuthorized(_req)) return res.status(401).json({ ok: false, error: "Unauthorized" });
  return res.json({ ok: true, stock: listStockLevels() });
};

export const handleAdminStockUpdate: RequestHandler = (req, res) => {
  if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: "Unauthorized" });
  const payload = req.body && typeof req.body === "object" ? (req.body as any) : {};
  const updatesRaw = payload.updates && typeof payload.updates === "object" ? payload.updates : null;

  if (!updatesRaw) {
    return res.status(400).json({ ok: false, error: "Envie updates no formato { PP: 10, P: 8, ... }" });
  }

  const updates: Partial<Record<StockSize, number>> = {};
  for (const [k, v] of Object.entries(updatesRaw)) {
    const size = String(k).toUpperCase() as StockSize;
    if (!validSizes.includes(size)) {
      return res.status(400).json({ ok: false, error: `Tamanho inválido: ${k}` });
    }
    const qty = Number(v);
    if (!Number.isInteger(qty) || qty < 0) {
      return res.status(400).json({ ok: false, error: `Quantidade inválida para ${size}` });
    }
    updates[size] = qty;
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ ok: false, error: "Nenhuma atualização recebida" });
  }

  const stock = setStockLevels(updates);
  return res.json({ ok: true, stock });
};

