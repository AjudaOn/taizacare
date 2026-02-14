import { env } from "../config";

export async function createMercadoPagoPreference(params: {
  orderId: string;
  paymentMethod: "pix" | "card";
  customerEmail: string;
  product: { title: string; quantity: number; unitPriceCents: number };
  shipping: { title: string; unitPriceCents: number };
}) {
  if (!env.mpAccessToken) {
    return {
      ok: true as const,
      mock: true as const,
      preferenceId: "MOCK_PREF",
      initPoint: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=MOCK",
    };
  }

  const url = "https://api.mercadopago.com/checkout/preferences";
  const preferenceBody = {
    items: [
      {
        id: env.productSku,
        title: params.product.title,
        quantity: params.product.quantity,
        currency_id: "BRL",
        unit_price: params.product.unitPriceCents / 100,
      },
      {
        id: "shipping",
        title: params.shipping.title,
        quantity: 1,
        currency_id: "BRL",
        unit_price: params.shipping.unitPriceCents / 100,
      },
    ],
    payer: {
      email: params.customerEmail,
    },
    payment_methods:
      params.paymentMethod === "pix"
        ? {
            installments: 1,
            excluded_payment_types: [
              { id: "credit_card" },
              { id: "debit_card" },
              { id: "ticket" },
              { id: "atm" },
              { id: "prepaid_card" },
            ],
          }
        : {
            installments: env.maxInstallments,
            excluded_payment_methods: [{ id: "pix" }],
          },
    external_reference: params.orderId,
    back_urls: {
      success: `${env.publicBaseUrl}/?status=success&orderId=${params.orderId}`,
      failure: `${env.publicBaseUrl}/?status=failure&orderId=${params.orderId}`,
      pending: `${env.publicBaseUrl}/?status=pending&orderId=${params.orderId}`,
    },
    auto_return: "approved",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.mpAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preferenceBody),
  });

  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    throw new Error(json?.message || json?.error || "Erro ao criar preferência no Mercado Pago");
  }

  const initPoint = json?.init_point || json?.sandbox_init_point;
  const preferenceId = json?.id;
  if (!initPoint || !preferenceId) {
    throw new Error("Resposta inválida do Mercado Pago (sem init_point/id)");
  }

  return { ok: true as const, preferenceId, initPoint };
}
