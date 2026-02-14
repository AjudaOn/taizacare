import { RequestHandler } from "express";
import { shippingQuoteInputSchema } from "../config";
import { quoteShippingMelhorEnvio } from "../integrations/melhorenvio";
import type { ShippingQuoteErrorResponse, ShippingQuoteResponse } from "@shared/commerce";

function isPacOrSedex(serviceName: string) {
  const normalized = serviceName.trim().toUpperCase();
  return normalized.startsWith("PAC") || normalized.startsWith("SEDEX");
}

export const handleShippingQuote: RequestHandler = async (req, res) => {
  try {
    const parsed = shippingQuoteInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const response: ShippingQuoteErrorResponse = { ok: false, error: "CEP inválido" };
      return res.status(400).json(response);
    }

    const toPostalCode = parsed.data.toPostalCode;
    const result = await quoteShippingMelhorEnvio({ toPostalCode, quantity: parsed.data.quantity });
    const filtered = result.options.filter((o) => isPacOrSedex(o.name));

    const response: ShippingQuoteResponse = {
      ok: true,
      toPostalCode,
      options: filtered.map((o) => ({
        serviceId: o.id,
        name: o.name,
        company: o.company,
        deliveryTime: o.deliveryTime ?? null,
        priceCents: o.priceCents,
        currency: "BRL" as const,
      })),
      ...(result.mock ? { mock: true } : {}),
    };

    return res.status(200).json(response);
  } catch (error: any) {
    const response: ShippingQuoteErrorResponse = {
      ok: false,
      error: error?.message || "Erro ao cotar frete",
    };
    return res.status(500).json(response);
  }
};
