import { RequestHandler } from "express";
import crypto from "crypto";
import { env } from "../config";
import { notifyN8nOrderPaid } from "../integrations/n8n";

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

export const handleAdminN8nTestPaid: RequestHandler = async (req, res) => {
  if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: "Unauthorized" });
  if (!env.n8nPaidWebhookUrl) {
    return res.status(400).json({ ok: false, error: "N8N_PAID_WEBHOOK_URL não configurado" });
  }

  const body = (req.body && typeof req.body === "object" ? req.body : {}) as any;

  const orderId = String(body.orderId || body.order_id || `TESTE-${crypto.randomUUID()}`);
  const paymentId = String(body.paymentId || body.payment_id || "TEST-PAYMENT");
  const totalCents = Number.isFinite(Number(body.totalCents ?? body.total_cents))
    ? Number(body.totalCents ?? body.total_cents)
    : 10990;

  const paidAt = new Date().toISOString();

  const fakeOrder = {
    id: orderId,
    status: "paid",
    payment_method: body.payment_method === "card" ? "card" : "pix",
    total_cents: totalCents,
    product_sku: body.product_sku ?? env.productSku,
    product_name: body.product_name ?? env.productName,
    product_qty: Number(body.product_qty ?? 1),
    product_price_cents: Number(body.product_price_cents ?? env.productPixPriceCents),
    shipping_to_postal_code: String(body.shipping_to_postal_code ?? "00000000"),
    shipping_service_name: String(body.shipping_service_name ?? "PAC"),
    shipping_price_cents: Number(body.shipping_price_cents ?? 0),
    customer_name: String(body.customer_name ?? "Cliente Teste"),
    customer_email: String(body.customer_email ?? "teste@exemplo.com"),
    customer_cpf: String(body.customer_cpf ?? "12345678901"),
    customer_phone: String(body.customer_phone ?? "44999999999"),
    paid_at: paidAt,
    created_at: paidAt,
    shipping_address_json:
      typeof body.shipping_address_json === "string"
        ? body.shipping_address_json
        : JSON.stringify(
            body.address ?? {
              postalCode: body.shipping_to_postal_code ?? "00000000",
              street: "Rua Teste",
              number: "123",
              complement: "",
              city: "Cidade",
              state: "PR",
            },
          ),
  };

  const fakePayment = {
    id: paymentId,
    status: "approved",
    transaction_amount: totalCents / 100,
  };

  const result = await notifyN8nOrderPaid({ order: fakeOrder, payment: fakePayment });
  if (!result.ok) return res.status(502).json({ ok: false, ...result });
  return res.json({ ok: true, ...result });
};
