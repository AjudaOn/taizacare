import { RequestHandler } from "express";
import { getOrderById } from "../db";
import type { OrderStatusErrorResponse, OrderStatusResponse } from "@shared/commerce";

export const handleOrderStatus: RequestHandler = (req, res) => {
  const orderId = typeof req.query.orderId === "string" ? req.query.orderId.trim() : "";

  if (!orderId) {
    const response: OrderStatusErrorResponse = { ok: false, error: "Pedido inválido" };
    return res.status(400).json(response);
  }

  const order = getOrderById(orderId);
  if (!order) {
    const response: OrderStatusErrorResponse = { ok: false, error: "Pedido não encontrado" };
    return res.status(404).json(response);
  }

  const response: OrderStatusResponse = {
    ok: true,
    orderId: order.id,
    status: order.status,
    paidAt: order.paid_at,
    paymentStatus: order.mp_payment_status,
  };
  return res.status(200).json(response);
};
