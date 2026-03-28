## Atualização de produção (fluxo oficial)

Este arquivo define um fluxo simples:

1. A **IA atualiza o código no GitHub** (commit + push na `main`).
2. O **operador roda manualmente na VPS** os comandos de update.

Neste servidor, o projeto roda com **systemd** (`taizacare.service`) em `/opt/taizacare`.
Não usar `pm2` para o TaizaCare.

## Responsabilidades

### IA (Codex)
- Fazer alterações no código.
- Validar build local quando necessário.
- Fazer `git commit` e `git push` na `main`.
- Informar ao operador:
  - SHA do commit publicado.
  - Bloco de comandos para rodar na VPS.

### Operador (VPS)
- Acessar o servidor.
- Rodar os comandos de atualização.
- Confirmar status do serviço e logs.

## Comandos que o operador deve rodar na VPS

```sh
cd /opt/taizacare && git pull origin main
npm --prefix layout install
npm --prefix layout run build
systemctl restart taizacare.service
systemctl status taizacare.service --no-pager
journalctl -u taizacare.service --no-pager | tail -n 80
```

## Template de resposta da IA após push

Sempre responder neste formato:

```txt
Código publicado na main.
Commit: <SHA>

Rode na VPS:
cd /opt/taizacare && git pull origin main
npm --prefix layout install
npm --prefix layout run build
systemctl restart taizacare.service
systemctl status taizacare.service --no-pager
journalctl -u taizacare.service --no-pager | tail -n 80
```

## Requisitos de produção

- Node.js `20.19+` (ou `22.12+`).
- Serviço systemd existente: `taizacare.service`.
- Variáveis de ambiente ficam somente no servidor (`/opt/taizacare/layout/.env`).

## Rollback rápido

```sh
cd /opt/taizacare
git log --oneline -n 10
git reset --hard <SHA_ANTERIOR>
systemctl restart taizacare.service
systemctl status taizacare.service --no-pager
```
