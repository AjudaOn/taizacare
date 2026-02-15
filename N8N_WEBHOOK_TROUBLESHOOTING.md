# Orientação: Teste de “venda paga” + troubleshooting n8n (TaizaCare)

Este documento registra o que fizemos em **15/02/2026** para restaurar o fluxo:

`TaizaCare (site) -> webhook do n8n -> workflow -> ações (ex.: WhatsApp)`

## Contexto do projeto (site)

- Projeto no servidor: `/opt/taizacare`
- `.env` usado em produção pelo site: `/opt/taizacare/layout/.env`
- Integração “pago” para o n8n:
  - `N8N_PAID_WEBHOOK_URL` (URL do Webhook Trigger no n8n)
  - Endpoint interno de teste: `POST http://localhost:3000/api/admin/n8n/test-paid`
  - Auth: header `Authorization: Bearer <ADMIN_TOKEN>` (lido de `layout/.env`)

### Teste rápido (sem Mercado Pago)

Dispara um “pedido pago fake” do próprio backend, que chama o n8n com `event: "order.paid"`:

```sh
curl -sS -X POST "http://localhost:3000/api/admin/n8n/test-paid" \
  -H "Authorization: Bearer $(grep -m1 '^ADMIN_TOKEN=' /opt/taizacare/layout/.env | cut -d= -f2-)" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"TESTE-001","paymentId":"TEST-PAYMENT-001","totalCents":10990}' \
  -w "\nHTTP %{http_code}\n"
```

Esperado: `HTTP 200` e JSON `{"ok":true,...}`.

### Simular o webhook do Mercado Pago (MP -> site -> n8n)

Este teste chama o endpoint do site como se fosse o Mercado Pago (`/api/mp/webhook`).

Pré-requisitos:
- `MP_ACCESS_TOKEN` precisa estar configurado no `layout/.env` (o handler consulta a API do MP para obter `status/amount/external_reference`).
- Você precisa de um `payment_id` real do MP **criado pelo seu checkout** (assim ele terá `external_reference` = `orderId` e o valor vai bater).

Comando (no servidor):

```sh
/opt/taizacare/scripts/simulate_mp_webhook.sh SEU_PAYMENT_ID http://localhost:3000
```

Obs.: se `MP_WEBHOOK_SECRET` estiver configurado no `layout/.env`, o script calcula automaticamente `x-request-id` e `x-signature`.

## Sintoma observado

- `curl` para o webhook do n8n travava e dava timeout (0 bytes recebidos).
- O endpoint do site retornava erro 500 com:
  - `AbortError: This operation was aborted`
  - Isso acontece porque o backend aborta a chamada ao n8n após ~5s (timeout).

## Diagnóstico que fizemos

1) Confirmar URL de produção configurada no site:

```sh
grep -n '^N8N_PAID_WEBHOOK_URL=' /opt/taizacare/layout/.env
```

2) Confirmar que o n8n estava vivo localmente:

```sh
curl -I --max-time 5 http://127.0.0.1:5678/
```

3) Confirmar que o webhook “invalid” respondia rápido (para separar “n8n morto” vs “workflow travando”):

```sh
curl -i --max-time 5 http://127.0.0.1:5678/webhook/invalid -H "Content-Type: application/json" -d '{}'
```

4) Ver logs do n8n:

```sh
docker logs -f --tail 200 n8n-main
```

Achado importante:

- Logs repetidos de `Task request timed out after 60 seconds`
- Isso indicou que o workflow estava ativo, mas travava esperando execução em **Task Runner**.

## Causa raiz

Os containers `n8n-main` e `n8n-runners` estavam em **redes Docker diferentes**, então o runner não conseguia falar com o broker:

- `n8n-main` na rede `bridge`
- `n8n-runners` na rede `root_default`

O runner tentava conectar no broker via `ws://n8n:5679/...`, mas o hostname/rota não existia entre redes.

Resultado: o webhook ficava aguardando indefinidamente (até timeouts internos) e o site abortava em 5s.

## Correção aplicada (sem recriar containers)

Conectamos o `n8n-main` na mesma rede do runner e definimos alias `n8n`:

```sh
docker network connect --alias n8n root_default n8n-main
```

Validações:

```sh
docker inspect n8n-main --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
docker inspect n8n-main --format '{{json (index .NetworkSettings.Networks "root_default").Aliases}}'
```

Depois disso, o webhook voltou a responder:

```sh
curl -i --max-time 10 http://127.0.0.1:5678/webhook/738b1788-5fa5-49b0-b4a4-a3fe6df10803 -H "Content-Type: application/json" -d '{"ping":true}'
curl -i --max-time 10 https://gransaigon.ajudaon.com.br/webhook/738b1788-5fa5-49b0-b4a4-a3fe6df10803 -H "Content-Type: application/json" -d '{"ping":true}'
```

E o teste do site voltou a funcionar (HTTP 200).

## Como evitar voltar a quebrar no futuro

### Se você recriar o container `n8n-main`

Garanta que ele já suba na rede correta, com alias:

- `--network root_default`
- `--network-alias n8n`

Se estiver usando `docker compose`, configure ambos os serviços no mesmo `networks:` e use `network_aliases: ["n8n"]` no serviço do n8n.

### Check rápido pós-reboot

```sh
docker ps
docker inspect n8n-main --format 'Restart={{.HostConfig.RestartPolicy.Name}} Networks={{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
curl -I --max-time 5 http://127.0.0.1:5678/
```

## Observações (crypto no Code node / Task Runners)

Durante a configuração do workflow “Taiza Care”, também apareceu o erro no n8n:

`Module 'crypto' is disallowed [line 1]`

Isso **não** é falta de instalação no servidor (Node.js já tem `crypto` builtin). É uma restrição do n8n para o Code node.

### O que funcionou aqui

Como estamos usando **Task Runners** (container separado), foi necessário permitir `crypto` no ambiente do **runner** e também do **n8n-main**:

- `NODE_FUNCTION_ALLOW_BUILTIN=crypto`

Obs.: apenas `N8N_NODE_FUNCTION_ALLOW_BUILTIN=crypto` não resolveu sozinho neste setup.

### Como foi aplicado (resumo)

1) Verificar env vars:

```sh
docker exec -it n8n-main sh -lc 'echo "NODE_FUNCTION_ALLOW_BUILTIN=$NODE_FUNCTION_ALLOW_BUILTIN"; echo "N8N_NODE_FUNCTION_ALLOW_BUILTIN=$N8N_NODE_FUNCTION_ALLOW_BUILTIN"'
docker exec -it n8n-runners sh -lc 'echo "NODE_FUNCTION_ALLOW_BUILTIN=$NODE_FUNCTION_ALLOW_BUILTIN"; echo "N8N_NODE_FUNCTION_ALLOW_BUILTIN=$N8N_NODE_FUNCTION_ALLOW_BUILTIN"'
```

2) Recriar `n8n-runners` com env file (e preservando config):

- Salvar env atual:
  - `docker inspect n8n-runners --format '{{range .Config.Env}}{{println .}}{{end}}' > /root/n8n-runners.env`
- Adicionar:
  - `NODE_FUNCTION_ALLOW_BUILTIN=crypto`
- Recriar container `n8n-runners` com `--env-file /root/n8n-runners.env` (mantendo rede/mounts/ports).

3) Recriar `n8n-main` para pegar a env var (env não muda com restart):

- Salvar env atual:
  - `docker inspect n8n-main --format '{{range .Config.Env}}{{println .}}{{end}}' > /root/n8n-main.env`
- Adicionar:
  - `NODE_FUNCTION_ALLOW_BUILTIN=crypto`
- Recriar `n8n-main` preservando volume `root_n8n_data:/home/node/.n8n`.

### Nota importante sobre o Code node (JS)

Mesmo após permitir builtin, o sandbox do Task Runner JS não expôs `crypto` global (`crypto.subtle`), então:

- Para validação HMAC, usamos **Code node Python** (funcionou).
- Para formatação da mensagem do Telegram, usamos **Expression** direto no node do Telegram (sem Code node).

## Telegram (mensagem para despacho)

O payload recebido do site no n8n é um JSON com:

- `event` (ex.: `order.paid`)
- `order` (cliente, produto, qty, total, endereço, frete, etc.)
- `mercado_pago` (status, payment_id, amount)

Fluxo mínimo recomendado:

- `Webhook (order.paid)` → `Telegram: Send Message` (Text como Expression usando `$json`)

Para ver a mensagem enviada:

- Workflow → **Executions** → abrir execução → clicar no node **Telegram** → Output (`message_id`, `chat_id`, `text`).

## Rede Docker (fix definitivo)

Além do “connect” manual, o mais robusto é garantir que os containers já nasçam na mesma rede:

- `n8n-main`: `--network root_default --network-alias n8n`
- `n8n-runners`: `--network root_default`

Isso evita o retorno de `Task request timed out after 60 seconds` após reboot/recriação.

## Apêndice: assinatura do payload (n8n)

O backend pode enviar:

- `x-taizacare-timestamp`
- `x-taizacare-signature` (HMAC-SHA256)

Template assinado:

`ts:{timestampMs};order_id:{orderId};payment_id:{paymentId};total_cents:{total};paid_at:{paidAt};`
