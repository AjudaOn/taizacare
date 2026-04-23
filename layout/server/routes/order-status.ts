import { RequestHandler } from "express";
import { getOrderById } from "../db";
import type { OrderStatusErrorResponse, OrderStatusResponse } from "@shared/commerce";
import { reconcileOrderPayment } from "../integrations/mercadopago-reconcile";

export const handleOrderStatus: RequestHandler = async (req, res) => {
  const orderId = typeof req.query.orderId === "string" ? req.query.orderId.trim() : "";

  if (!orderId) {
    const response: OrderStatusErrorResponse = { ok: false, error: "Pedido inválido" };
    return res.status(400).json(response);
  }

  let order = getOrderById(orderId);
  if (!order) {
    const response: OrderStatusErrorResponse = { ok: false, error: "Pedido não encontrado" };
    return res.status(404).json(response);
  }

  try {
    if (order.status !== "paid" && order.mp_payment_id) {
      const reconciled = await reconcileOrderPayment(order);
      order = reconciled.order;
    }
  } catch {
    // If Mercado Pago is temporarily unavailable, fall back to local status.
  }

  const response: OrderStatusResponse = {
    ok: true,
    orderId: order.id,
    status: order.status,
    paidAt: order.paid_at,
    paymentStatus: order.mp_payment_status,
  };
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  return res.status(200).json(response);
};
