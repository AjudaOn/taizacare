import crypto from "crypto";
import { env } from "../config";

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function signTemplate(params: { secret: string; template: string }) {
  const hex = crypto.createHmac("sha256", params.secret).update(params.template).digest("hex");
  return `sha256=${hex}`;
}

export type PaidNotifyInput = {
  order: any;
  payment: any;
};

export async function notifyN8nOrderPaid(params: PaidNotifyInput) {
  if (!env.n8nPaidWebhookUrl) return { ok: true as const, skipped: true as const };

  const address =
    typeof params.order?.shipping_address_json === "string"
      ? safeJsonParse<any>(params.order.shipping_address_json)
      : params.order?.shipping?.address ?? null;

  const payload = {
    event: "order.paid",
    order: {
      id: params.order.id,
      status: params.order.status,
      payment_method: params.order.payment_method,
      total_cents: params.order.total_cents,
      product: {
        sku: params.order.product_sku,
        name: params.order.product_name,
        size: params.order.product_size,
        qty: params.order.product_qty,
        price_cents: params.order.product_price_cents,
      },
      shipping: {
        to_postal_code: params.order.shipping_to_postal_code,
        service_name: params.order.shipping_service_name,
        price_cents: params.order.shipping_price_cents,
        address,
      },
      customer: {
        name: params.order.customer_name,
        email: params.order.customer_email,
        cpf: params.order.customer_cpf,
        phone: params.order.customer_phone,
      },
      paid_at: params.order.paid_at,
      created_at: params.order.created_at,
    },
    mercado_pago: {
      payment_id: params.payment?.id ? String(params.payment.id) : null,
      status: params.payment?.status ? String(params.payment.status) : null,
      transaction_amount: params.payment?.transaction_amount ?? null,
    },
  };

  const bodyText = JSON.stringify(payload);
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (env.n8nPaidWebhookSecret) {
    const timestampMs = Date.now();
    headers["x-taizacare-timestamp"] = String(timestampMs);
    const template = `ts:${timestampMs};order_id:${String(params.order.id)};payment_id:${String(
      params.payment?.id ?? "",
    )};total_cents:${String(params.order.total_cents)};paid_at:${String(params.order.paid_at ?? "")};`;
    headers["x-taizacare-signature"] = signTemplate({ secret: env.n8nPaidWebhookSecret, template });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(env.n8nPaidWebhookUrl, {
      method: "POST",
      headers,
      body: bodyText,
      signal: controller.signal,
    });
    const text = await res.text().catch(() => "");
    return {
      ok: res.ok,
      status: res.status,
      body: text.slice(0, 500),
    };
  } finally {
    clearTimeout(timeout);
  }
}
