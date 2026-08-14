# Rodando `/app` localmente

Ordem: dev-infra pessoal → backend → frontend. Backend e frontend são projetos independentes (sem workspace), cada um com seu próprio `node_modules`/`vendor`.

## 1. Dev-infra pessoal (Postgres/Redis/MinIO/Traefik)

Repo separado, fora do beaconray:

```bash
cd /home/guilherme/pessoal/dev-infra
cp .env.example .env   # se ainda não existir
docker compose up -d
```

Confirma que subiu:

```bash
docker exec pessoal-postgres psql -U devuser -d beaconray -c '\dx'   # espera ver vector + pg_trgm
docker exec pessoal-redis redis-cli ping                              # espera PONG
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:59000/minio/health/live   # espera 200
```

Portas (default, ajustável em `.env`): Postgres `55432`, Redis `56379`, MinIO API `59000` / Console `59001`, Traefik `58080` / dashboard `58081`.

## 2. Backend (Symfony, `app/backend`)

Primeira vez (clone novo, sem `vendor/`):

```bash
cd app/backend
composer install
php bin/console league:oauth2-server:generate-keypair   # só se config/jwt/*.pem não existir ainda
```

`.env.local` (não versionado, precisa existir — já configurado nesta máquina apontando pro dev-infra pessoal):
```
DATABASE_URL="postgresql://devuser:devpass@127.0.0.1:55432/beaconray?serverVersion=16&charset=utf8"
MESSENGER_TRANSPORT_DSN=redis://127.0.0.1:56379/messages
MINIO_ENDPOINT=http://127.0.0.1:59000
MINIO_REGION=us-east-1
MINIO_BUCKET=beaconray
MINIO_ACCESS_KEY=devuser
MINIO_SECRET_KEY=devpass123
MINIO_USE_PATH_STYLE=true
ARTIFACT_PRESIGN_TTL=180
COMPILER_PATH=/home/guilherme/pessoal/justgui/projetos/beaconray/compiler
```

Migrations (só precisa rodar quando há migration nova):
```bash
php bin/console doctrine:migrations:migrate --no-interaction
```

**Bucket do MinIO** (só na primeira vez, `createBucket` não é automático):
```bash
php -r '
require "vendor/autoload.php";
use Symfony\Component\Dotenv\Dotenv;
(new Dotenv())->loadEnv(".env");
(new Aws\S3\S3Client(["version"=>"latest","region"=>$_ENV["MINIO_REGION"],"endpoint"=>$_ENV["MINIO_ENDPOINT"],"use_path_style_endpoint"=>true,"credentials"=>["key"=>$_ENV["MINIO_ACCESS_KEY"],"secret"=>$_ENV["MINIO_SECRET_KEY"]]]))
  ->createBucket(["Bucket"=>$_ENV["MINIO_BUCKET"]]);
'
```

Subir o servidor (dev) — **sem** Symfony CLI instalado nesta máquina, usar o servidor embutido do PHP direto:
```bash
php -S 127.0.0.1:8123 -t public public/index.php
```
**Atenção:** sempre passe `public/index.php` explícito como router — sem isso, rotas com múltiplos pontos no path (ex. `.../versions/1.0.0/download`) dão 404 por peculiaridade do servidor embutido, não bug de rota (confirmado, ver `SYMFONY_GUIDE.md`). Se instalar o Symfony CLI depois, `symfony server:start` funciona igual, sem essa pegadinha.

Testar rápido (cria um client OAuth2 de teste, pega token, chama a API):
```bash
php bin/console league:oauth2-server:create-client "cli-dev" cli-dev cli-dev-secret --grant-type=client_credentials --scope=components_read --scope=components_write

TOKEN=$(curl -s -X POST http://127.0.0.1:8123/token -d grant_type=client_credentials -d client_id=cli-dev -d client_secret=cli-dev-secret -d scope=components_read | php -r 'echo json_decode(file_get_contents("php://stdin"))->access_token;')

curl -s http://127.0.0.1:8123/v1/cli/components -H "Authorization: Bearer $TOKEN"
```

## 3. Frontend (Astro, `app/frontend`)

Precisa que os componentes já estejam compilados em `compiler/out/` (gitignored, regenerado a qualquer momento):
```bash
cd ../../compiler
npm install   # primeira vez
npm run build
node dist/compile.js examples/button.ast.json
node dist/compile.js examples/counter.ast.json
node dist/compile.js examples/save-status.ast.json
```

Depois:
```bash
cd ../app/frontend
npm install   # primeira vez
npm run build && npx astro preview --port 4321
```
Abre `http://localhost:4321` — mostra Button/Counter/SaveStatus, cada um com instância React e Vue lado a lado.

**Sobre `npm run dev` (`astro dev`):** testado nesta sessão e **não funciona** neste ambiente sandboxed — o supervisor de background novo do Astro 7.2 (`astro dev --background`/`stop`/`status`/`logs`, mencionado no `app/frontend/CLAUDE.md` gerado pelo scaffold) morre com "Dev server process exited before becoming ready" sem log útil, provavelmente uma restrição do sandbox (não do código — `astro build` e `astro preview` funcionam normalmente, testados várias vezes). No seu terminal normal (fora deste ambiente), `npm run dev` deve funcionar sem problema — só documentando a limitação real encontrada aqui, não escondendo.

## Ordem resumida pra já ter tudo rodando
```bash
# 1
cd /home/guilherme/pessoal/dev-infra && docker compose up -d

# 2 (backend, se já migrado/bucket criado antes, só isso)
cd /home/guilherme/pessoal/justgui/projetos/beaconray/app/backend
php -S 127.0.0.1:8123 -t public public/index.php

# 3 (frontend — npm run dev não funciona neste ambiente sandboxed, ver nota acima)
cd /home/guilherme/pessoal/justgui/projetos/beaconray/app/frontend
npm run build && npx astro preview --port 4321
```
