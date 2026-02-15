import { RequestHandler } from "express";
import crypto from "crypto";
import { env } from "../config";
import { listOrders } from "../db";

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

export const handleAdminOrders: RequestHandler = (req, res) => {
  if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
  const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;

  const rows = listOrders({
    status:
      status === "paid" || status === "pending_payment" || status === "canceled" ? status : undefined,
    limit,
  });

  return res.json({ ok: true, orders: rows });
};

