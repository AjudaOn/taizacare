## Atualizar o servidor via Git (VPS)

Assumindo que o projeto está em `/opt/taizacare` e o remote já está configurado.

## Método padrão (OBRIGATÓRIO neste servidor)

Neste servidor, o site roda via **systemd** (`taizacare.service`). Não use `pm2` para o TaizaCare.

No servidor, rode **sempre** nesta ordem:

```sh
cd /opt/taizacare && git pull
```

```sh
npm --prefix layout install
```

```sh
npm --prefix layout run build
```

```sh
systemctl restart taizacare.service
```

Checagens úteis:

```sh
systemctl status taizacare.service --no-pager
```

```sh
journalctl -u taizacare.service --no-pager | tail -n 80
```

## Requisitos (produção)

- Node.js `20.19+` (ou `22.12+`). Se você estiver em Node 18, o build pode até rodar mas o Vite pode falhar/avisar.
- Gerenciador de processo (neste servidor): `systemd` (`taizacare.service`).

### 1) Acessar o servidor

```sh
ssh root@SEU_IP
cd /opt/taizacare
```

### 1.1) (Opcional) Atualizar Node.js (recomendado)

Exemplo com NodeSource (Node 22):

```sh
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get update
sudo apt-get install -y nodejs
node -v
```

### 2) Atualizar para o último código

```sh
git status -sb
git pull origin main
git rev-parse --short HEAD
```

### 3) Rebuild / restart (sem Docker)

Use este bloco somente como referência. O “Método padrão” acima é o que deve ser usado no servidor.

```sh
# dependências + build (frontend)
npm --prefix layout install
npm --prefix layout run build
```

### 3.1) Rebuild / restart (sem PM2, com systemd)

Se o serviço ainda não existir, crie/ajuste assim:

```sh
sudo tee /etc/systemd/system/taizacare.service >/dev/null <<'EOF'
[Unit]
Description=TaizaCare
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/taizacare/layout
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node /opt/taizacare/layout/dist/server/node-build.mjs
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now taizacare.service
sudo systemctl restart taizacare.service
sudo systemctl status taizacare.service --no-pager -l
```

### 4) Rebuild / restart (com Docker) — quando você criar o Docker

```sh
docker compose pull
docker compose build --no-cache
docker compose up -d
docker compose ps
docker compose logs -f --tail=100
```

### Variáveis de ambiente (produção)

- Não commitar `layout/.env` (fica só no servidor).
- Ajuste no servidor:
  - `layout/.env` → `PUBLIC_BASE_URL=https://taizacare.com.br`
  - `MP_ACCESS_TOKEN=...`
  - `ME_TOKEN=...`

### Rollback rápido (se algo quebrar)

```sh
git log --oneline -n 10
git reset --hard <SHA_ANTERIOR>

# reinicia o serviço (systemd ou Docker)
systemctl restart taizacare.service || true
docker compose up -d || true
```
