import { RequestHandler } from "express";
import { env } from "../config";
import { getOrderById, markOrderPaid, setOrderPaymentStatus } from "../db";

function extractPaymentId(body: any): string | null {
  if (!body || typeof body !== "object") return null;
  if (typeof body.id === "string" || typeof body.id === "number") return String(body.id);
  if (body.data && (typeof body.data.id === "string" || typeof body.data.id === "number")) return String(body.data.id);
  if (body.resource && typeof body.resource === "string") {
    const match = body.resource.match(/\/payments\/(\d+)/);
    if (match?.[1]) return match[1];
  }
  return null;
}

async function fetchMercadoPagoPayment(paymentId: string) {
  const url = `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.mpAccessToken}`,
      "Content-Type": "application/json",
    },
  });
  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    throw new Error(json?.message || json?.error || "Falha ao consultar pagamento no Mercado Pago");
  }
  return json as any;
}

export const handleMercadoPagoWebhook: RequestHandler = async (req, res) => {
  try {
    if (!env.mpAccessToken) return res.status(200).json({ ok: true });

    const paymentId = extractPaymentId(req.body);
    if (!paymentId) return res.status(200).json({ ok: true });

    const payment = await fetchMercadoPagoPayment(paymentId);
    const orderId = String(payment?.external_reference || "");
    const status = String(payment?.status || "");
    if (!orderId) return res.status(200).json({ ok: true });

    const order = getOrderById(orderId);
    if (!order) return res.status(200).json({ ok: true });

    // Basic integrity checks to avoid random webhook spam updating orders.
    const paymentAmount = Number(payment?.transaction_amount);
    if (Number.isFinite(paymentAmount)) {
      const expected = order.total_cents / 100;
      if (Math.abs(paymentAmount - expected) > 0.01) {
        return res.status(200).json({ ok: true });
      }
    }

    // Update status fields even if not approved (helpful for debugging).
    setOrderPaymentStatus({ orderId, mpPaymentId: String(paymentId), mpPaymentStatus: status });

    if (status === "approved") {
      const approvedAt = payment?.date_approved || payment?.date_last_updated || new Date().toISOString();
      markOrderPaid({
        orderId,
        mpPaymentId: String(paymentId),
        mpPaymentStatus: status,
        paidAtIso: new Date(approvedAt).toISOString(),
      });
    }

    return res.status(200).json({ ok: true });
  } catch {
    // Always 200 so MP doesn't keep retrying forever while we debug.
    return res.status(200).json({ ok: true });
  }
};

