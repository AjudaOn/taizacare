import { RequestHandler } from "express";
import { checkoutInputSchema, env, pricing } from "../config";
import { quoteShippingMelhorEnvio } from "../integrations/melhorenvio";
import { createMercadoPagoPreference } from "../integrations/mercadopago";
import { insertOrder, setOrderMercadoPago } from "../db";
import type { CheckoutErrorResponse, CheckoutResponse } from "@shared/commerce";
import crypto from "crypto";

function isPacOrSedex(serviceName: string) {
  const normalized = serviceName.trim().toUpperCase();
  return normalized.startsWith("PAC") || normalized.startsWith("SEDEX");
}

export const handleCheckout: RequestHandler = async (req, res) => {
  try {
    const parsed = checkoutInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const response: CheckoutErrorResponse = { ok: false, error: "Dados inválidos" };
      return res.status(400).json(response);
    }

    const orderId = crypto.randomUUID();
    const { customer, address, shipping, paymentMethod } = parsed.data;
    const productQty = parsed.data.product?.qty ?? 1;

    const quote = await quoteShippingMelhorEnvio({
      toPostalCode: address.postalCode,
      serviceIds: [shipping.serviceId],
      quantity: productQty,
    });

    const option = quote.options[0];
    if (!option) {
      const response: CheckoutErrorResponse = { ok: false, error: "Não foi possível calcular o frete" };
      return res.status(400).json(response);
    }

    if (!isPacOrSedex(option.name)) {
      const response: CheckoutErrorResponse = { ok: false, error: "Opção de frete inválida" };
      return res.status(400).json(response);
    }

    const shippingPriceCents = option.priceCents;
    const productPriceCents =
      paymentMethod === "pix" ? env.productPixPriceCents : pricing.productCardPriceCents;
    const totalCents = productPriceCents * productQty + shippingPriceCents;

    insertOrder({
      id: orderId,
      status: "pending_payment",
      payment_method: paymentMethod,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone ?? null,
      shipping_to_postal_code: address.postalCode,
      shipping_address_json: JSON.stringify(address),
      shipping_service_id: String(option.id),
      shipping_service_name: option.name,
      shipping_price_cents: shippingPriceCents,
      product_sku: env.productSku,
      product_name: env.productName,
      product_qty: productQty,
      product_price_cents: productPriceCents,
      total_cents: totalCents,
      mp_preference_id: null,
      mp_init_point: null,
    });

    const mp = await createMercadoPagoPreference({
      orderId,
      paymentMethod,
      customerEmail: customer.email,
      product: {
        title: env.productName,
        quantity: productQty,
        unitPriceCents: productPriceCents,
      },
      shipping: {
        title: `Frete - ${option.name}`,
        unitPriceCents: shippingPriceCents,
      },
    });

    setOrderMercadoPago(orderId, mp.preferenceId, mp.initPoint);

    const response: CheckoutResponse = {
      ok: true,
      orderId,
      initPoint: mp.initPoint,
      ...(mp.mock ? { mock: true } : {}),
    };
    return res.status(200).json(response);
  } catch (error: any) {
    const response: CheckoutErrorResponse = { ok: false, error: error?.message || "Erro no checkout" };
    return res.status(500).json(response);
  }
};
