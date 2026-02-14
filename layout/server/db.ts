import path from "path";
import fs from "fs";
import Database, { type Database as BetterSqliteDatabase } from "better-sqlite3";

export type OrderStatus = "pending_payment" | "paid" | "canceled";

export type OrderRow = {
  id: string;
  status: OrderStatus;
  payment_method: "pix" | "card";
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_to_postal_code: string;
  shipping_address_json: string;
  shipping_service_id: string;
  shipping_service_name: string;
  shipping_price_cents: number;
  product_sku: string;
  product_name: string;
  product_qty: number;
  product_price_cents: number;
  total_cents: number;
  mp_preference_id: string | null;
  mp_init_point: string | null;
  created_at: string;
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
      customer_phone TEXT,
      shipping_to_postal_code TEXT NOT NULL,
      shipping_address_json TEXT NOT NULL,
      shipping_service_id TEXT NOT NULL,
      shipping_service_name TEXT NOT NULL,
      shipping_price_cents INTEGER NOT NULL,
      product_sku TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_qty INTEGER NOT NULL,
      product_price_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      mp_preference_id TEXT,
      mp_init_point TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_orders_email_created ON orders(customer_email, created_at);
  `);

  // light migration for local dev
  ensureColumn(db, "orders", "payment_method", "TEXT NOT NULL DEFAULT 'pix'");
  ensureColumn(db, "orders", "product_qty", "INTEGER NOT NULL DEFAULT 1");

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
      customer_name, customer_email, customer_phone,
      shipping_to_postal_code, shipping_address_json,
      shipping_service_id, shipping_service_name, shipping_price_cents,
      product_sku, product_name, product_qty, product_price_cents,
      total_cents,
      mp_preference_id, mp_init_point,
      created_at, updated_at
    ) VALUES (
      @id, @status,
      @payment_method,
      @customer_name, @customer_email, @customer_phone,
      @shipping_to_postal_code, @shipping_address_json,
      @shipping_service_id, @shipping_service_name, @shipping_price_cents,
      @product_sku, @product_name, @product_qty, @product_price_cents,
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
