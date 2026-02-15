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

  let publicBaseUrl: URL;
  try {
    publicBaseUrl = new URL(env.publicBaseUrl);
  } catch {
    throw new Error(
      `PUBLIC_BASE_URL inválida (${JSON.stringify(env.publicBaseUrl)}). Defina uma URL completa, ex: https://taizacare.ajudaon.com.br`,
    );
  }
  if (publicBaseUrl.protocol !== "http:" && publicBaseUrl.protocol !== "https:") {
    throw new Error(
      `PUBLIC_BASE_URL inválida (${JSON.stringify(env.publicBaseUrl)}). Use http:// ou https://`,
    );
  }
  const isLocalhost =
    publicBaseUrl.hostname === "localhost" ||
    publicBaseUrl.hostname === "127.0.0.1" ||
    publicBaseUrl.hostname === "[::1]";
  if (!isLocalhost && publicBaseUrl.protocol === "http:") {
    throw new Error(
      `Em produção, PUBLIC_BASE_URL precisa ser HTTPS (ex: https://taizacare.ajudaon.com.br). Valor atual: ${JSON.stringify(env.publicBaseUrl)}`,
    );
  }

  const url = "https://api.mercadopago.com/checkout/preferences";
  const baseUrl = publicBaseUrl.toString().replace(/\/+$/, "");
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
            default_payment_method_id: "pix",
            excluded_payment_types: [
              { id: "credit_card" },
              { id: "debit_card" },
              { id: "ticket" },
            ],
          }
        : {
            installments: env.maxInstallments,
            excluded_payment_methods: [{ id: "pix" }],
          },
    external_reference: params.orderId,
    back_urls: {
      success: `${baseUrl}/?status=success&orderId=${params.orderId}`,
      failure: `${baseUrl}/?status=failure&orderId=${params.orderId}`,
      pending: `${baseUrl}/?status=pending&orderId=${params.orderId}`,
    },
    ...(publicBaseUrl.protocol === "https:" ? { auto_return: "approved" as const } : {}),
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
    const mpMessage = json?.message || json?.error || "Erro ao criar preferência no Mercado Pago";
    throw new Error(
      `${mpMessage} | publicBaseUrl=${env.publicBaseUrl} | back_urls=${JSON.stringify(
        preferenceBody.back_urls,
      )}`,
    );
  }

  const initPoint = json?.init_point || json?.sandbox_init_point;
  const preferenceId = json?.id;
  if (!initPoint || !preferenceId) {
    throw new Error("Resposta inválida do Mercado Pago (sem init_point/id)");
  }

  return { ok: true as const, preferenceId, initPoint };
}
