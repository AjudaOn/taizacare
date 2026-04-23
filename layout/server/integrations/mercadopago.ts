import { env } from "../config";

function getValidatedPublicBaseUrl() {
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
  return publicBaseUrl;
}

export async function createMercadoPagoPreference(params: {
  orderId: string;
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

  const publicBaseUrl = getValidatedPublicBaseUrl();
  const url = "https://api.mercadopago.com/checkout/preferences";
  const baseUrl = publicBaseUrl.toString().replace(/\/+$/, "");
  const totalCents = params.product.quantity * params.product.unitPriceCents + params.shipping.unitPriceCents;
  const itemTitle = `${params.product.title} (${params.product.quantity}x) + ${params.shipping.title}`;
  const preferenceBody = {
    // Use a single item with total (product + shipping) to avoid checkout edge-cases.
    items: [
      {
        id: env.productSku,
        title: itemTitle,
        quantity: 1,
        currency_id: "BRL",
        unit_price: totalCents / 100,
      },
    ],
    payer: {
      email: params.customerEmail,
    },
    payment_methods: {
      installments: env.maxInstallments,
      excluded_payment_methods: [{ id: "pix" }],
    },
    external_reference: params.orderId,
    notification_url: `${baseUrl}/api/mp/webhook`,
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

export async function createMercadoPagoPixPayment(params: {
  orderId: string;
  customerEmail: string;
  customerName: string;
  customerCpf: string;
  product: { title: string; quantity: number; unitPriceCents: number };
  shipping: { title: string; unitPriceCents: number };
}) {
  if (!env.mpAccessToken) {
    return {
      ok: true as const,
      mock: true as const,
      paymentId: "MOCK-PIX",
      qrCode: "00020101021226880014br.gov.bcb.pix2566pix-h.mock/qr/123456789520400005303986540510.995802BR5913TAIZA CARE6009SAO PAULO62070503***6304ABCD",
      qrCodeBase64: null,
      status: "pending",
    };
  }

  const publicBaseUrl = getValidatedPublicBaseUrl();
  const baseUrl = publicBaseUrl.toString().replace(/\/+$/, "");
  const totalCents = params.product.quantity * params.product.unitPriceCents + params.shipping.unitPriceCents;
  const url = "https://api.mercadopago.com/v1/payments";
  const nameParts = params.customerName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "Cliente";
  const lastName = nameParts.slice(1).join(" ") || "Taiza Care";
  const paymentBody = {
    transaction_amount: totalCents / 100,
    description: `${params.product.title} (${params.product.quantity}x) + ${params.shipping.title}`,
    payment_method_id: "pix",
    notification_url: `${baseUrl}/api/mp/webhook`,
    external_reference: params.orderId,
    payer: {
      email: params.customerEmail,
      first_name: firstName,
      last_name: lastName,
      identification: {
        type: "CPF",
        number: params.customerCpf,
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.mpAccessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `pix-${params.orderId}`,
    },
    body: JSON.stringify(paymentBody),
  });

  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    const mpMessage = json?.message || json?.error || "Erro ao criar pagamento Pix no Mercado Pago";
    throw new Error(`${mpMessage} | publicBaseUrl=${env.publicBaseUrl}`);
  }

  const paymentId = json?.id ? String(json.id) : "";
  const transactionData = json?.point_of_interaction?.transaction_data;
  const qrCode = transactionData?.qr_code ? String(transactionData.qr_code) : "";
  const qrCodeBase64 =
    transactionData?.qr_code_base64 != null ? String(transactionData.qr_code_base64) : null;
  const status = json?.status ? String(json.status) : "pending";

  if (!paymentId || !qrCode) {
    throw new Error("Resposta inválida do Mercado Pago (sem payment_id/qr_code)");
  }

  return {
    ok: true as const,
    paymentId,
    qrCode,
    qrCodeBase64,
    status,
  };
}
