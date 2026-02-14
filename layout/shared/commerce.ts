export type ShippingQuoteOption = {
  serviceId: number | string;
  name: string;
  company?: string;
  deliveryTime?: number | null;
  priceCents: number;
  currency: "BRL";
};

export type ShippingQuoteResponse = {
  ok: true;
  toPostalCode: string;
  options: ShippingQuoteOption[];
  mock?: boolean;
};

export type ShippingQuoteErrorResponse = {
  ok: false;
  error: string;
};

export type CheckoutResponse = {
  ok: true;
  orderId: string;
  initPoint: string;
  mock?: boolean;
};

export type CheckoutErrorResponse = {
  ok: false;
  error: string;
};

