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
  initPoint?: string;
  pix?: {
    paymentId: string;
    qrCode: string;
    qrCodeBase64?: string | null;
  };
  mock?: boolean;
};

export type CheckoutErrorResponse = {
  ok: false;
  error: string;
};

export type OrderStatusResponse = {
  ok: true;
  orderId: string;
  status: "pending_payment" | "paid" | "canceled";
  paidAt: string | null;
  paymentStatus: string | null;
};

export type OrderStatusErrorResponse = {
  ok: false;
  error: string;
};
