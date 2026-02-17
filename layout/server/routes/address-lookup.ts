import { RequestHandler } from "express";

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  localidade?: string;
  uf?: string;
  bairro?: string;
};

export const handleAddressLookup: RequestHandler = async (req, res) => {
  try {
    const postalCodeRaw = String(req.query.postalCode ?? "");
    const postalCode = postalCodeRaw.replace(/\D/g, "");

    if (postalCode.length !== 8) {
      return res.status(400).json({ ok: false, error: "CEP inválido" });
    }

    const viaCepRes = await fetch(`https://viacep.com.br/ws/${postalCode}/json/`);
    const viaCepData = (await viaCepRes.json()) as ViaCepResponse;

    if (!viaCepRes.ok || viaCepData?.erro) {
      return res.status(404).json({ ok: false, error: "CEP não encontrado" });
    }

    return res.status(200).json({
      ok: true,
      address: {
        street: viaCepData.logradouro ?? "",
        city: viaCepData.localidade ?? "",
        state: String(viaCepData.uf ?? "").toUpperCase(),
        district: viaCepData.bairro ?? "",
      },
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error?.message || "Erro ao buscar CEP" });
  }
};

