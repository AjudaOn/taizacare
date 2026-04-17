import { env } from "../config";

export type MelhorEnvioServiceQuote = {
  id: number | string;
  name?: string;
  price?: string | number;
  currency?: string;
  delivery_time?: number;
  company?: { name?: string };
  error?: string;
};

type ShipmentProduct = {
  id: string;
  width: number;
  height: number;
  length: number;
  weight: number;
  quantity: 1;
};

type PackageSpec = {
  kind: "small" | "large";
  units: number;
  width: number;
  height: number;
  length: number;
  weight: number;
};

const SMALL_PACKAGE_SPECS: Record<1 | 2 | 3, Omit<PackageSpec, "kind" | "units">> = {
  1: { width: 20, height: 3, length: 26, weight: 0.14 },
  2: { width: 20, height: 5, length: 27, weight: 0.27 },
  3: { width: 20, height: 7, length: 27, weight: 0.4 },
};

const LARGE_PACKAGE_SPEC = {
  width: 40,
  height: 7,
  length: 50,
} as const;

function buildShipmentPackages(quantity: number): PackageSpec[] {
  if (quantity <= 3) {
    const spec = SMALL_PACKAGE_SPECS[quantity as 1 | 2 | 3];
    return [{ kind: "small", units: quantity, ...spec }];
  }

  if (quantity <= 6) {
    const weightByUnits = { 4: 0.54, 5: 0.67, 6: 0.8 } as const;
    return [
      {
        kind: "large",
        units: quantity,
        ...LARGE_PACKAGE_SPEC,
        weight: weightByUnits[quantity as 4 | 5 | 6],
      },
    ];
  }

  const remainder = quantity - 6;
  const packages: PackageSpec[] = [
    {
      kind: "large",
      units: 6,
      ...LARGE_PACKAGE_SPEC,
      weight: 0.8,
    },
  ];

  if (remainder <= 3) {
    const spec = SMALL_PACKAGE_SPECS[remainder as 1 | 2 | 3];
    packages.push({ kind: "small", units: remainder, ...spec });
    return packages;
  }

  packages.push({
    kind: "large",
    units: 4,
    ...LARGE_PACKAGE_SPEC,
    weight: 0.54,
  });
  return packages;
}

function buildShipmentProducts(quantity: number): ShipmentProduct[] {
  return buildShipmentPackages(quantity).map((pkg, index) => ({
    id: `${env.productSku}-${pkg.kind}-${pkg.units}-${index + 1}`,
    width: pkg.width,
    height: pkg.height,
    length: pkg.length,
    weight: pkg.weight,
    quantity: 1,
  }));
}

function parsePriceToCents(value: unknown) {
  const raw = (typeof value === "number" ? String(value) : String(value ?? ""))
    .trim()
    .replace(/[^\d.,-]/g, "");

  if (!raw) return null;

  // Normalize decimal separator safely.
  // - "23,00" -> "23.00"
  // - "23.00" -> "23.00"
  // - "1.234,56" -> "1234.56"
  // - "1,234.56" -> "1234.56"
  const hasDot = raw.includes(".");
  const hasComma = raw.includes(",");

  let normalized = raw;
  if (hasDot && hasComma) {
    const lastDot = raw.lastIndexOf(".");
    const lastComma = raw.lastIndexOf(",");
    const decimalIsComma = lastComma > lastDot;

    if (decimalIsComma) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = raw.replace(",", ".");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

export async function quoteShippingMelhorEnvio(params: {
  toPostalCode: string;
  serviceIds?: Array<number | string>;
  quantity?: number;
}) {
  if (!env.meToken) {
    return {
      ok: true as const,
      mock: true as const,
      options: [
        { id: "mock-pac", name: "PAC", priceCents: 1890, deliveryTime: 6, company: "Correios" },
        { id: "mock-sedex", name: "SEDEX", priceCents: 3290, deliveryTime: 2, company: "Correios" },
      ],
    };
  }

  const url = new URL("/api/v2/me/shipment/calculate", env.meBaseUrl);
  const quantity = Math.max(1, Math.min(10, params.quantity ?? 1));
  const body = {
    from: { postal_code: env.shippingOriginPostalCode },
    to: { postal_code: params.toPostalCode },
    products: buildShipmentProducts(quantity),
    options: {
      receipt: false,
      own_hand: false,
    },
    services: params.serviceIds?.length ? params.serviceIds : undefined,
  };

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.meToken}`,
      "User-Agent": env.meUserAgent,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Melhor Envio error (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as MelhorEnvioServiceQuote[] | Record<string, unknown>;
  const list = Array.isArray(data) ? data : [];

  const options = list
    .filter((s) => !s.error)
    .map((s) => {
      const priceCents = parsePriceToCents(s.price) ?? 0;
      return {
        id: s.id,
        name: s.name ?? `Serviço ${s.id}`,
        priceCents,
        deliveryTime: s.delivery_time ?? null,
        company: s.company?.name ?? undefined,
      };
    })
    .filter((s) => s.priceCents > 0);

  return { ok: true as const, options };
}
