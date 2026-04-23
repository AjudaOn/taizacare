import { env } from "../config";
import { getOrderById, markOrderPaid, setOrderPaymentStatus, type OrderRow } from "../db";
import { notifyN8nOrderPaid } from "./n8n";

type MercadoPagoPayment = {
  id?: string | number;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  date_approved?: string;
  date_last_updated?: string;
};

const scheduledPaymentChecks = new Set<string>();

export async function fetchMercadoPagoPayment(paymentId: string) {
  const url = `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.mpAccessToken}`,
      "Content-Type": "application/json",
    },
  });
  const json = (await res.json().catch(() => null)) as MercadoPagoPayment | null;
  if (!res.ok || !json) {
    throw new Error("Falha ao consultar pagamento no Mercado Pago");
  }
  return json;
}

async function applyPaymentToOrder(order: OrderRow, payment: MercadoPagoPayment) {
  const paymentId = payment?.id ? String(payment.id) : order.mp_payment_id;
  const status = payment?.status ? String(payment.status) : "";

  const paymentAmount = Number(payment?.transaction_amount);
  if (Number.isFinite(paymentAmount)) {
    const expected = order.total_cents / 100;
    if (Math.abs(paymentAmount - expected) > 0.01) {
      return { order, payment, updated: false as const, reason: "amount_mismatch" as const };
    }
  }

  if (paymentId && status && (order.mp_payment_id !== paymentId || order.mp_payment_status !== status)) {
    setOrderPaymentStatus({
      orderId: order.id,
      mpPaymentId: paymentId,
      mpPaymentStatus: status,
    });
  }

  const wasPaid = order.status === "paid" && !!order.paid_at;
  if (status === "approved" && paymentId && !wasPaid) {
    const approvedAt = payment?.date_approved || payment?.date_last_updated || new Date().toISOString();
    const paidAtIso = new Date(approvedAt).toISOString();
    markOrderPaid({
      orderId: order.id,
      mpPaymentId: paymentId,
      mpPaymentStatus: status,
      paidAtIso,
    });

    const refreshedOrder = getOrderById(order.id) ?? {
      ...order,
      status: "paid",
      paid_at: paidAtIso,
      mp_payment_id: paymentId,
      mp_payment_status: status,
    };

    void notifyN8nOrderPaid({ order: refreshedOrder, payment }).catch(() => {});
    return { order: refreshedOrder, payment, updated: true as const };
  }

  return { order: getOrderById(order.id) ?? order, payment, updated: false as const };
}

export async function reconcileOrderPayment(order: OrderRow) {
  if (!env.mpAccessToken || !order.mp_payment_id) {
    return { order, updated: false as const, payment: null };
  }

  const payment = await fetchMercadoPagoPayment(order.mp_payment_id);
  return applyPaymentToOrder(order, payment);
}

export function scheduleOrderPaymentReconciliation(orderId: string, delaysMs = [15000, 60000]) {
  for (const delayMs of delaysMs) {
    const key = `${orderId}:${delayMs}`;
    if (scheduledPaymentChecks.has(key)) continue;
    scheduledPaymentChecks.add(key);

    setTimeout(() => {
      void (async () => {
        try {
          const order = getOrderById(orderId);
          if (!order || !order.mp_payment_id || order.status === "paid") return;
          await reconcileOrderPayment(order);
        } catch {
          // Best-effort reconciliation.
        } finally {
          scheduledPaymentChecks.delete(key);
        }
      })();
    }, delayMs);
  }
}
