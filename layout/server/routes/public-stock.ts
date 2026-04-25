import { RequestHandler } from "express";
import { listStockLevels } from "../db";

export const handlePublicStockGet: RequestHandler = (_req, res) => {
  return res.json({ ok: true, stock: listStockLevels() });
};
