import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type OrderRow = {
  id: string;
  status: "pending_payment" | "paid" | "canceled";
  payment_method: "pix" | "card";
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_to_postal_code: string;
  shipping_address_json: string;
  shipping_service_name: string;
  shipping_price_cents: number;
  product_name: string;
  product_qty: number;
  product_price_cents: number;
  total_cents: number;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  mp_payment_status: string | null;
  paid_at: string | null;
  created_at: string;
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") || "");
  const [inputToken, setInputToken] = useState(token);
  const [status, setStatus] = useState<"all" | "paid" | "pending_payment" | "canceled">("paid");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const authHeader = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (status !== "all") qs.set("status", status);
      qs.set("limit", "200");
      const res = await fetch(`/api/admin/orders?${qs.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Falha ao carregar pedidos");
      setOrders(data.orders || []);
    } catch (e: any) {
      setOrders([]);
      setError(e?.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function handleSaveToken() {
    const next = inputToken.trim();
    setToken(next);
    sessionStorage.setItem("admin_token", next);
  }

  return (
    <div className="min-h-screen bg-brand-paper text-brand-ink">
      <div className="container mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-brandSerif text-brand-charcoal">Admin • Pedidos</h1>
            <p className="mt-2 text-sm text-brand-gray">
              Lista interna de pedidos (SQLite). Atualiza quando o webhook do Mercado Pago marca como pago.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={loadOrders} disabled={!token || loading} className="rounded-full">
              {loading ? "Atualizando..." : "Atualizar"}
            </Button>
          </div>
        </div>

        <Card className="mt-8 rounded-[2rem] border-[#d2c9be]/20">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-charcoal">
                  Token do Admin
                </label>
                <input
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border border-[#d2c9be]/30 bg-white px-4 text-sm"
                  placeholder="Cole o ADMIN_TOKEN aqui"
                />
                <p className="mt-2 text-xs text-brand-gray">
                  Esse token fica só no seu navegador (sessionStorage).
                </p>
              </div>
              <div className="flex items-end gap-3">
                <Button onClick={handleSaveToken} className="w-full rounded-xl">
                  Salvar
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-[10px] uppercase tracking-widest font-bold text-brand-charcoal">Filtro</span>
              {(["paid", "pending_payment", "canceled", "all"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-full px-4 py-2 text-xs transition ${
                    status === s ? "bg-brand-charcoal text-white" : "bg-white text-brand-charcoal border border-[#d2c9be]/30"
                  }`}
                >
                  {s === "all" ? "Todos" : s === "paid" ? "Pagos" : s === "pending_payment" ? "Aguardando" : "Cancelados"}
                </button>
              ))}
            </div>

            {error ? <div className="mt-6 text-sm text-red-700">{error}</div> : null}
          </CardContent>
        </Card>

        <div className="mt-8 grid grid-cols-1 gap-4">
          {orders.map((o) => {
            const address = safeJsonParse<any>(o.shipping_address_json);
            const addressLine = address
              ? `${address.street || ""}, ${address.number || ""}${address.complement ? ` - ${address.complement}` : ""} • ${address.city || ""}/${address.state || ""} • CEP ${address.postalCode || o.shipping_to_postal_code}`
              : `CEP ${o.shipping_to_postal_code}`;

            return (
              <Card key={o.id} className="rounded-[2rem] border-[#d2c9be]/20">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#afa498]/10 px-3 py-1 text-xs font-bold text-[#3a3a3a]">
                          {o.status === "paid" ? "PAGO" : o.status === "pending_payment" ? "AGUARDANDO" : "CANCELADO"}
                        </span>
                        <span className="text-xs text-brand-gray">#{o.id}</span>
                      </div>
                      <div className="mt-3 text-base font-medium text-brand-charcoal">
                        {o.product_name} • {o.product_qty}x • {o.payment_method.toUpperCase()}
                      </div>
                      <div className="mt-1 text-sm text-brand-gray">{o.customer_name}</div>
                      <div className="mt-1 text-sm text-brand-gray">
                        {o.customer_email} {o.customer_phone ? `• ${o.customer_phone}` : ""}
                      </div>
                      <div className="mt-3 text-sm text-brand-gray">{addressLine}</div>
                      <div className="mt-1 text-sm text-brand-gray">
                        Frete: {o.shipping_service_name} • {formatBRL(o.shipping_price_cents)}
                      </div>
                      {o.paid_at ? <div className="mt-2 text-xs text-brand-gray">Pago em: {o.paid_at}</div> : null}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-sm text-brand-gray">Total</div>
                      <div className="text-2xl font-brandSerif text-brand-charcoal whitespace-nowrap tabular-nums">
                        {formatBRL(o.total_cents)}
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-brand-gray">
                        {o.mp_payment_status ? <div>Status MP: {o.mp_payment_status}</div> : null}
                        {o.mp_payment_id ? <div>Payment ID: {o.mp_payment_id}</div> : null}
                        {o.mp_preference_id ? <div>Pref ID: {o.mp_preference_id}</div> : null}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {!orders.length && token && !loading ? (
            <div className="text-sm text-brand-gray">Nenhum pedido encontrado.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

