# TaizaCare

Este repositório usa o projeto em `layout/` como base do site.

## Rodar

```bash
npm run install:layout
npm run dev
```

## Integrações (dev)

- Copie `layout/.env.example` para `layout/.env` e preencha `MP_ACCESS_TOKEN` e `ME_TOKEN` para ativar Mercado Pago + Melhor Envio.
- Não cole tokens em chat nem faça commit de `layout/.env` (está no `.gitignore`).
- Preço: `PRODUCT_PRICE_PIX_CENTS` + `CARD_MARKUP_PERCENT` (cartão fica +% em cima do PIX).
- Endpoints:
  - `POST /api/shipping/quote` `{ "toPostalCode": "00000000" }`
  - `POST /api/checkout` (cria a cobrança no Mercado Pago e retorna `initPoint`)

## Assets

- Logo: `layout/public/LOGO_TAIZA_CURVAS-08.png`
- Logo (branca): `layout/public/logo_branca.png`
- Logo (retangular): `layout/public/logo_ajustada.png`
- Fontes:
  - `layout/public/fonts/aserha.ttf`
  - `layout/public/fonts/LuxoraGrotesk-Thin.woff2`
