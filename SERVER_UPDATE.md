## Atualizar o servidor via Git (VPS)

Assumindo que o projeto está em `/opt/taizacare` e o remote já está configurado.

## Requisitos (produção)

- Node.js `20.19+` (ou `22.12+`). Se você estiver em Node 18, o build pode até rodar mas o Vite pode falhar/avisar.
- Um gerenciador de processo (recomendado): `pm2` **ou** `systemd`.

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

Use se você estiver rodando “na mão” com Node/PM2 (recomendado).

```sh
# dependências + build
npm run install:layout
npm --prefix layout run build

# instalar pm2 (se ainda não tiver)
npm i -g pm2

# subir/reiniciar (exemplo com pm2)
PORT=3000 pm2 start "npm --prefix layout run start" --name taizacare --update-env || pm2 restart taizacare --update-env
pm2 status
```

### 3.1) Rebuild / restart (sem PM2, com systemd)

Se você não usa `pm2`, crie um service:

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
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now taizacare
sudo systemctl restart taizacare
sudo systemctl status taizacare --no-pager -l
```

### 3) Rebuild / restart (com Docker) — quando você criar o Docker

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
  - `layout/.env` → `PUBLIC_BASE_URL=https://taizacare.ajudaon.com.br`
  - `MP_ACCESS_TOKEN=...`
  - `ME_TOKEN=...`

### Rollback rápido (se algo quebrar)

```sh
git log --oneline -n 10
git reset --hard <SHA_ANTERIOR>

# reinicia o serviço (PM2 ou Docker)
pm2 restart taizacare || true
docker compose up -d || true
```
