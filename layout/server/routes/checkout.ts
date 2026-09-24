import { RequestHandler } from "express";
import { checkoutInputSchema, env, pricing } from "../config";
import { quoteShippingMelhorEnvio } from "../integrations/melhorenvio";
import { createMercadoPagoPixPayment, createMercadoPagoPreference } from "../integrations/mercadopago";
import {
  STOCK_SIZES,
  getStockLevel,
  insertOrder,
  setOrderMercadoPago,
  setOrderPaymentStatus,
  type StockSize,
} from "../db";
import type { CheckoutErrorResponse, CheckoutResponse } from "@shared/commerce";
import { formatOrderItems, type OrderItem } from "../../shared/commerce";
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
    const { customer, shipping, paymentMethod } = parsed.data;
    const product = parsed.data.product;
    const rawItems = product?.items ?? (product?.size ? [{ size: product.size, qty: product.qty }] : []);

    // Merge repeated sizes and keep the PP..GG order so summaries read consistently.
    const qtyBySize = new Map<StockSize, number>();
    for (const item of rawItems) {
      const size = item.size.trim().toUpperCase() as StockSize;
      if (!STOCK_SIZES.includes(size)) {
        const response: CheckoutErrorResponse = { ok: false, error: `Tamanho ${size} inválido` };
        return res.status(400).json(response);
      }
      qtyBySize.set(size, (qtyBySize.get(size) ?? 0) + item.qty);
    }
    const productItems: OrderItem[] = STOCK_SIZES.filter((size) => qtyBySize.has(size)).map((size) => ({
      size,
      qty: qtyBySize.get(size)!,
    }));

    if (!productItems.length) {
      const response: CheckoutErrorResponse = { ok: false, error: "Selecione um tamanho" };
      return res.status(400).json(response);
    }

    const productQty = productItems.reduce((sum, item) => sum + item.qty, 0);
    if (productQty > 10) {
      const response: CheckoutErrorResponse = { ok: false, error: "Limite de 10 peças por pedido" };
      return res.status(400).json(response);
    }

    for (const item of productItems) {
      const availableStock = getStockLevel(item.size as StockSize)?.quantity ?? 0;
      if (availableStock <= 0) {
        const response: CheckoutErrorResponse = { ok: false, error: `Tamanho ${item.size} indisponível no momento` };
        return res.status(400).json(response);
      }
      if (item.qty > availableStock) {
        const response: CheckoutErrorResponse = {
          ok: false,
          error: `Temos apenas ${availableStock} unidade(s) no tamanho ${item.size}`,
        };
        return res.status(400).json(response);
      }
    }

    // Single-size orders keep the plain size ("P"); mixed orders get a readable summary ("1x PP, 1x G").
    const productSize = productItems.length === 1 ? productItems[0].size : formatOrderItems(productItems);
    let shippingServiceId = "pickup";
    let shippingServiceName = "Retirada no local";
    let shippingPriceCents = 0;
    let shippingToPostalCode = "00000000";
    let shippingAddress = {
      postalCode: "00000000",
      street: "Retirada no local",
      number: "-",
      complement: "",
      city: "",
      state: "",
    };

    if (shipping.method === "shipping") {
      const address = parsed.data.address;
      if (!address) {
        const response: CheckoutErrorResponse = { ok: false, error: "Informe os dados de entrega" };
        return res.status(400).json(response);
      }

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

      shippingServiceId = String(option.id);
      shippingServiceName = option.name;
      shippingPriceCents = option.priceCents;
      shippingToPostalCode = address.postalCode;
      shippingAddress = {
        postalCode: address.postalCode,
        street: address.street,
        number: address.number,
        complement: address.complement ?? "",
        city: address.city,
        state: address.state,
      };
    }

    const productPriceCents =
      paymentMethod === "pix" ? env.productPixPriceCents : pricing.productCardPriceCents;
    const totalCents = productPriceCents * productQty + shippingPriceCents;

    insertOrder({
      id: orderId,
      status: "pending_payment",
      payment_method: paymentMethod,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_cpf: customer.cpf,
      customer_phone: customer.phone,
      shipping_to_postal_code: shippingToPostalCode,
      shipping_address_json: JSON.stringify(shippingAddress),
      shipping_service_id: shippingServiceId,
      shipping_service_name: shippingServiceName,
      shipping_price_cents: shippingPriceCents,
      product_sku: env.productSku,
      product_name: env.productName,
      product_size: productSize,
      product_items: JSON.stringify(productItems),
      product_qty: productQty,
      product_price_cents: productPriceCents,
      total_cents: totalCents,
      mp_preference_id: null,
      mp_init_point: null,
      mp_payment_id: null,
      mp_payment_status: null,
      paid_at: null,
    });

    const productPayload = {
      title: env.productName,
      quantity: productQty,
      unitPriceCents: productPriceCents,
    };
    const shippingPayloadForMp = {
      title: shipping.method === "pickup" ? "Retirada no local" : `Frete - ${shippingServiceName}`,
      unitPriceCents: shippingPriceCents,
    };

    let response: CheckoutResponse;
    if (paymentMethod === "pix") {
      const mp = await createMercadoPagoPixPayment({
        orderId,
        customerEmail: customer.email,
        customerName: customer.name,
        customerCpf: customer.cpf,
        product: productPayload,
        shipping: shippingPayloadForMp,
      });

      setOrderPaymentStatus({
        orderId,
        mpPaymentId: mp.paymentId,
        mpPaymentStatus: mp.status,
      });

      response = {
        ok: true,
        orderId,
        pix: {
          paymentId: mp.paymentId,
          qrCode: mp.qrCode,
          qrCodeBase64: mp.qrCodeBase64,
        },
        ...(mp.mock ? { mock: true } : {}),
      };
    } else {
      const mp = await createMercadoPagoPreference({
        orderId,
        customerEmail: customer.email,
        product: productPayload,
        shipping: shippingPayloadForMp,
      });

      setOrderMercadoPago(orderId, mp.preferenceId, mp.initPoint);

      response = {
        ok: true,
        orderId,
        initPoint: mp.initPoint,
        ...(mp.mock ? { mock: true } : {}),
      };
    }

    return res.status(200).json(response);
  } catch (error: any) {
    const response: CheckoutErrorResponse = { ok: false, error: error?.message || "Erro no checkout" };
    return res.status(500).json(response);
  }
};
