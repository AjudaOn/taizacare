## Atualizar o servidor via Git (VPS)

Assumindo que o projeto está em `/opt/taizacare` e o remote já está configurado.

### 1) Acessar o servidor

```sh
ssh root@SEU_IP
cd /opt/taizacare
```

### 2) Atualizar para o último código

```sh
git status -sb
git pull origin main
git rev-parse --short HEAD
```

### 3) Rebuild / restart (sem Docker)

Use se você estiver rodando “na mão” com Node/PM2.

```sh
# dependências + build
npm run install:layout
npm --prefix layout run build

# subir/reiniciar (exemplo com pm2)
PORT=3000 pm2 start "npm --prefix layout run start" --name taizacare --update-env || pm2 restart taizacare --update-env
pm2 status
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

