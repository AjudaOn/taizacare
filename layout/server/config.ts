import { z } from "zod";

function envString(name: string, fallback: string) {
  const value = process.env[name];
  if (value == null) return fallback;
  const trimmed = value.trim();
  return trimmed === "" ? fallback : trimmed;
}

function envNumber(name: string, fallback: number) {
  const value = process.env[name];
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  publicBaseUrl: envString("PUBLIC_BASE_URL", "http://localhost:8080").replace(/\/+$/, ""),

  // Mercado Pago
  mpAccessToken: envString("MP_ACCESS_TOKEN", ""),
  mpWebhookSecret: envString("MP_WEBHOOK_SECRET", ""),

  // Dispatch automation (n8n, etc.)
  n8nPaidWebhookUrl: envString("N8N_PAID_WEBHOOK_URL", ""),
  n8nPaidWebhookSecret: envString("N8N_PAID_WEBHOOK_SECRET", ""),

  // Admin
  adminToken: envString("ADMIN_TOKEN", ""),

  // Melhor Envio
  meBaseUrl: process.env.ME_BASE_URL ?? "https://melhorenvio.com.br",
  meToken: process.env.ME_TOKEN ?? "",
  meUserAgent: process.env.ME_USER_AGENT ?? "TaizaCare (contato via WhatsApp)",

  // Shipping/product defaults (Taiza Care)
  shippingOriginPostalCode: process.env.SHIPPING_ORIGIN_POSTAL_CODE ?? "87502080",
  productSku: process.env.PRODUCT_SKU ?? "calcinha-pos-parto",
  productName: process.env.PRODUCT_NAME ?? "Calcinha Pós-Parto Taiza Care",
  productPixPriceCents: envNumber("PRODUCT_PRICE_PIX_CENTS", 10990),
  cardMarkupPercent: envNumber("CARD_MARKUP_PERCENT", 5),
  productWeightKg: envNumber("PRODUCT_WEIGHT_KG", 0.12),
  productLengthCm: envNumber("PRODUCT_LENGTH_CM", 17),
  productWidthCm: envNumber("PRODUCT_WIDTH_CM", 15),
  productHeightCm: envNumber("PRODUCT_HEIGHT_CM", 3),
  maxInstallments: envNumber("MP_MAX_INSTALLMENTS", 3),
} as const;

export const pricing = {
  productCardPriceCents: Math.round(env.productPixPriceCents * (1 + env.cardMarkupPercent / 100)),
} as const;

export const shippingQuoteInputSchema = z.object({
  toPostalCode: z
    .string()
    .min(8)
    .transform((v) => v.replace(/\D/g, "")),
  quantity: z.number().int().min(1).max(10).optional(),
});

export const checkoutInputSchema = z.object({
  paymentMethod: z.enum(["pix", "card"]),
  customer: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(8),
  }),
  address: z.object({
    postalCode: z.string().min(8).transform((v) => v.replace(/\D/g, "")),
    street: z.string().min(2),
    number: z.string().min(1),
    complement: z.string().optional(),
    city: z.string().min(2),
    state: z
      .string()
      .min(2)
      .max(2)
      .transform((v) => v.trim().toUpperCase()),
  }),
  shipping: z.object({
    serviceId: z.union([z.string().min(1), z.number()]),
  }),
  product: z
    .object({
      qty: z.number().int().min(1).max(10).default(1),
      size: z.string().optional(),
    })
    .optional(),
});
