import { RequestHandler } from "express";
import { env } from "../config";
import { getOrderById } from "../db";
import crypto from "crypto";
import {
  fetchMercadoPagoPayment,
  applyPaymentToOrder,
  scheduleOrderPaymentReconciliation,
} from "../integrations/mercadopago-reconcile";
function extractPaymentIdFromBody(body: any): string | null {
  if (!body || typeof body !== "object") return null;
  if (typeof body.id === "string" || typeof body.id === "number") return String(body.id);
  if (body.data && (typeof body.data.id === "string" || typeof body.data.id === "number")) return String(body.data.id);
  if (body.resource && typeof body.resource === "string") {
    const match = body.resource.match(/\/payments\/(\d+)/);
    if (match?.[1]) return match[1];
  }
  return null;
}

function extractPaymentIdFromQuery(query: any): string | null {
  if (!query || typeof query !== "object") return null;
  const direct =
    query["data.id"] ??
    query["data_id"] ??
    query["id"] ??
    (query.data && (query.data.id ?? query.data["id"]));
  if (typeof direct === "string" || typeof direct === "number") return String(direct);
  return null;
}

function parseXSignature(headerValue: string | undefined | null) {
  if (!headerValue) return null;
  const parts = headerValue
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const map = new Map<string, string>();
  for (const part of parts) {
    const [k, ...rest] = part.split("=");
    if (!k || rest.length === 0) continue;
    map.set(k.trim(), rest.join("=").trim());
  }
  const ts = map.get("ts");
  const v1 = map.get("v1");
  if (!ts || !v1) return null;
  return { ts, v1 };
}

function timingSafeEqualHex(a: string, b: string) {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function verifyWebhookSignature(params: {
  secret: string;
  signatureHeader: string | undefined;
  requestIdHeader: string | undefined;
  dataId: string | null;
}) {
  const parsed = parseXSignature(params.signatureHeader);
  if (!parsed) return { ok: false as const, reason: "missing_signature" as const };
  if (!params.requestIdHeader) return { ok: false as const, reason: "missing_request_id" as const };
  if (!params.dataId) return { ok: false as const, reason: "missing_data_id" as const };

  const nowSeconds = Math.floor(Date.now() / 1000);
  const tsNumber = Number(parsed.ts);
  if (!Number.isFinite(tsNumber)) return { ok: false as const, reason: "invalid_ts" as const };
  if (Math.abs(nowSeconds - tsNumber) > 10 * 60) {
    return { ok: false as const, reason: "stale_ts" as const };
  }

  const dataIdNormalized = String(params.dataId).toLowerCase();
  const template = `id:${dataIdNormalized};request-id:${params.requestIdHeader};ts:${parsed.ts};`;
  const hmac = crypto.createHmac("sha256", params.secret).update(template).digest("hex");
  if (!timingSafeEqualHex(hmac, parsed.v1)) return { ok: false as const, reason: "invalid_hmac" as const };
  return { ok: true as const };
}

export const handleMercadoPagoWebhook: RequestHandler = async (req, res) => {
  try {
    if (!env.mpAccessToken) return res.status(200).json({ ok: true });

    if (env.mpWebhookSecret) {
      const requestId = req.header("x-request-id") ?? undefined;
      const xSignature = req.header("x-signature") ?? undefined;
      const dataId = extractPaymentIdFromQuery(req.query);
      const verified = verifyWebhookSignature({
        secret: env.mpWebhookSecret,
        signatureHeader: xSignature,
        requestIdHeader: requestId,
        dataId,
      });
      if (!verified.ok) return res.status(401).json({ ok: false });
    }

    const paymentId = extractPaymentIdFromBody(req.body) ?? extractPaymentIdFromQuery(req.query);
    if (!paymentId) return res.status(200).json({ ok: true });

    const payment = await fetchMercadoPagoPayment(paymentId);
    const orderId = String(payment?.external_reference || "");
    if (!orderId) return res.status(200).json({ ok: true });

    const order = getOrderById(orderId);
    if (!order) return res.status(200).json({ ok: true });
    const result = await applyPaymentToOrder(order, payment);
    const paymentStatus = String(result.payment?.status || "");
    if (paymentStatus !== "approved") {
      scheduleOrderPaymentReconciliation(orderId);
    }

    return res.status(200).json({ ok: true });
  } catch {
    // Always 200 so MP doesn't keep retrying forever while we debug.
    return res.status(200).json({ ok: true });
  }
};
