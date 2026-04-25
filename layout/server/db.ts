import path from "path";
import fs from "fs";
import Database, { type Database as BetterSqliteDatabase } from "better-sqlite3";

export type OrderStatus = "pending_payment" | "paid" | "canceled";
export type StockSize = "PP" | "P" | "M" | "G" | "GG";
const STOCK_SIZES: StockSize[] = ["PP", "P", "M", "G", "GG"];

export type OrderRow = {
  id: string;
  status: OrderStatus;
  payment_method: "pix" | "card";
  customer_name: string;
  customer_email: string;
  customer_cpf: string | null;
  customer_phone: string | null;
  shipping_to_postal_code: string;
  shipping_address_json: string;
  shipping_service_id: string;
  shipping_service_name: string;
  shipping_price_cents: number;
  product_sku: string;
  product_name: string;
  product_size: string | null;
  product_qty: number;
  product_price_cents: number;
  total_cents: number;
  mp_preference_id: string | null;
  mp_init_point: string | null;
  mp_payment_id: string | null;
  mp_payment_status: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StockRow = {
  size: StockSize;
  quantity: number;
  updated_at: string;
};

let dbSingleton: BetterSqliteDatabase | null = null;

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

function ensureColumn(db: BetterSqliteDatabase, tableName: string, columnName: string, columnDef: string) {
  const cols = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .map((r: any) => String(r.name));
  if (!cols.includes(columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef};`);
  }
}

export function getDb() {
  if (dbSingleton) return dbSingleton;

  const dataDir = ensureDataDir();
  const filename = path.join(dataDir, "taizacare.sqlite");
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_cpf TEXT,
      customer_phone TEXT,
      shipping_to_postal_code TEXT NOT NULL,
      shipping_address_json TEXT NOT NULL,
      shipping_service_id TEXT NOT NULL,
      shipping_service_name TEXT NOT NULL,
      shipping_price_cents INTEGER NOT NULL,
      product_sku TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_size TEXT,
      product_qty INTEGER NOT NULL,
      product_price_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      mp_preference_id TEXT,
      mp_init_point TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_orders_email_created ON orders(customer_email, created_at);
    CREATE TABLE IF NOT EXISTS stock_levels (
      size TEXT PRIMARY KEY,
      quantity INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);

  const now = new Date().toISOString();
  const seedStmt = db.prepare(`
    INSERT OR IGNORE INTO stock_levels (size, quantity, updated_at)
    VALUES (?, 0, ?)
  `);
  for (const size of STOCK_SIZES) seedStmt.run(size, now);

  // light migration for local dev
  ensureColumn(db, "orders", "payment_method", "TEXT NOT NULL DEFAULT 'pix'");
  ensureColumn(db, "orders", "product_qty", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn(db, "orders", "customer_cpf", "TEXT");
  ensureColumn(db, "orders", "mp_payment_id", "TEXT");
  ensureColumn(db, "orders", "mp_payment_status", "TEXT");
  ensureColumn(db, "orders", "paid_at", "TEXT");
  ensureColumn(db, "orders", "product_size", "TEXT");

  dbSingleton = db;
  return dbSingleton;
}

export function insertOrder(row: Omit<OrderRow, "created_at" | "updated_at">) {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO orders (
      id, status,
      payment_method,
      customer_name, customer_email, customer_cpf, customer_phone,
      shipping_to_postal_code, shipping_address_json,
      shipping_service_id, shipping_service_name, shipping_price_cents,
      product_sku, product_name, product_size, product_qty, product_price_cents,
      total_cents,
      mp_preference_id, mp_init_point,
      created_at, updated_at
    ) VALUES (
      @id, @status,
      @payment_method,
      @customer_name, @customer_email, @customer_cpf, @customer_phone,
      @shipping_to_postal_code, @shipping_address_json,
      @shipping_service_id, @shipping_service_name, @shipping_price_cents,
      @product_sku, @product_name, @product_size, @product_qty, @product_price_cents,
      @total_cents,
      @mp_preference_id, @mp_init_point,
      @created_at, @updated_at
    )
  `);
  stmt.run({ ...row, created_at: now, updated_at: now });
}

export function setOrderMercadoPago(orderId: string, preferenceId: string, initPoint: string) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE orders
    SET mp_preference_id = ?, mp_init_point = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(preferenceId, initPoint, new Date().toISOString(), orderId);
}

export function getOrderById(orderId: string): OrderRow | undefined {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM orders WHERE id = ?`);
  return stmt.get(orderId) as OrderRow | undefined;
}

export function listOrders(params?: { status?: OrderStatus; limit?: number }) {
  const db = getDb();
  const limit = Math.min(Math.max(params?.limit ?? 100, 1), 500);
  const status = params?.status;
  if (status) {
    const stmt = db.prepare(`SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ?`);
    return stmt.all(status, limit) as OrderRow[];
  }
  const stmt = db.prepare(`SELECT * FROM orders ORDER BY created_at DESC LIMIT ?`);
  return stmt.all(limit) as OrderRow[];
}

export function markOrderPaid(params: {
  orderId: string;
  mpPaymentId: string;
  mpPaymentStatus: string;
  paidAtIso: string;
}) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE orders
    SET
      status = 'paid',
      mp_payment_id = ?,
      mp_payment_status = ?,
      paid_at = ?,
      updated_at = ?
    WHERE id = ?
  `);
  stmt.run(
    params.mpPaymentId,
    params.mpPaymentStatus,
    params.paidAtIso,
    new Date().toISOString(),
    params.orderId,
  );
}

export function setOrderPaymentStatus(params: { orderId: string; mpPaymentId: string; mpPaymentStatus: string }) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE orders
    SET
      mp_payment_id = ?,
      mp_payment_status = ?,
      updated_at = ?
    WHERE id = ?
  `);
  stmt.run(params.mpPaymentId, params.mpPaymentStatus, new Date().toISOString(), params.orderId);
}

export function listStockLevels() {
  const db = getDb();
  const stmt = db.prepare(`SELECT size, quantity, updated_at FROM stock_levels ORDER BY CASE size
    WHEN 'PP' THEN 1
    WHEN 'P' THEN 2
    WHEN 'M' THEN 3
    WHEN 'G' THEN 4
    WHEN 'GG' THEN 5
    ELSE 99
  END`);
  return stmt.all() as StockRow[];
}

export function getStockLevel(size: StockSize) {
  const db = getDb();
  const stmt = db.prepare(`SELECT size, quantity, updated_at FROM stock_levels WHERE size = ?`);
  return stmt.get(size) as StockRow | undefined;
}

export function setStockLevels(updates: Partial<Record<StockSize, number>>) {
  const db = getDb();
  const now = new Date().toISOString();
  const updateStmt = db.prepare(`UPDATE stock_levels SET quantity = ?, updated_at = ? WHERE size = ?`);
  const tx = db.transaction((entries: Array<[StockSize, number]>) => {
    for (const [size, quantity] of entries) {
      updateStmt.run(quantity, now, size);
    }
  });

  tx(Object.entries(updates) as Array<[StockSize, number]>);
  return listStockLevels();
}
