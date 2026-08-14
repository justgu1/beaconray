# Guia Symfony — Beaconray Backend

Este arquivo existe porque comentário no código não — cada arquivo novo do backend ganha uma entrada aqui explicando o quê, por quê daquele jeito, por quê naquele lugar, e qual padrão da comunidade Symfony/API Platform ele segue. Atualizado toda sessão, junto com `CHANGELOG.md` (raiz do repo).

Ver `.specs/backend-architecture-spec.md` e `.specs/ADRS.md` (ADR-015 a ADR-018) pro "porquê" arquitetural completo — aqui é o "o quê é este arquivo especificamente".

---

## Sessão 1 — Scaffold

### `composer.json` / estrutura gerada por `composer create-project symfony/skeleton`
**O que é:** projeto Symfony em branco, sem nenhum bundle de framework web completo (`symfony/skeleton` é deliberadamente mínimo — ao contrário do `symfony/website-skeleton`, que já vem com Twig/forms/etc que não precisamos numa API pura).

**Versão real:** Symfony **7.4** (LTS, suporte até 11/2028), não 7.2 como cogitado antes de rodar — pinar em `"7.2.*"` de propósito bateu em versões com CVE conhecida (composer recusou instalar, corretamente). Deixar o Composer escolher a versão estável atual em vez de fixar um wildcard específico é o comportamento certo aqui: você quer a versão mais recente da mesma major/LTS, não uma patch específica potencialmente vulnerável.

**Padrão que segue:** `symfony/skeleton` é literalmente o ponto de partida oficial recomendado pra uma API (https://symfony.com/doc/current/setup.html) — não o "framework completo", que traz peso (Twig, forms) que uma API não usa.

### Pacotes instalados (`composer require api`)
**O que é:** `composer require api` é uma receita Symfony Flex — instala **api-platform/symfony** + Doctrine ORM + Doctrine Migrations Bundle + Symfony Serializer + Symfony Validator + Symfony Security Bundle de uma vez (o "api-pack"), não pacotes escolhidos um a um.

**Por que esse pacote (e não `api-platform/api-platform`):** o pacote completo (`api-platform/api-platform`) traz Caddy, Mercure (push em tempo real) e admin PWA — infra que não precisamos agora (protótipo). `composer require api` no skeleton puro dá só o essencial (API Platform + Doctrine), sem a infra extra. Decisão registrada em ADR-016.

**Padrão que segue:** exatamente a instrução oficial do próprio API Platform pra instalação "à la carte" em cima de um Symfony existente (https://api-platform.com/docs/symfony/).

### `league/oauth2-server-bundle`
**O que é:** o servidor OAuth2 (emite/valida tokens) — Symfony Security sozinho só faz autenticação/autorização, não implementa um servidor OAuth2. Vai ser usado pro fluxo `npx beaconray login` (BK-005).

**Por que esse pacote:** é o bundle Symfony construído em cima da `league/oauth2-server` (a implementação OAuth2 mais usada no ecossistema PHP hoje) — não existe alternativa "oficial" do próprio Symfony pra isso.

### `aws/aws-sdk-php`
**O que é:** cliente S3, usado contra o MinIO (que fala o protocolo S3). Vai virar a base do `Storage/MinioArtifactStorage` (BK-003).

**Por que direto e não via Flysystem:** `league/flysystem-aws-s3-v3`/`symfony/flysystem-bundle` não têm suporte de primeira classe pra gerar URL pré-assinada (o requisito central do BK-003) — issue aberta, sem resolução, no repositório do Flysystem-bundle. `S3Client::createPresignedRequest()` já resolve isso direto, com assinatura SigV4 (HMAC-SHA256). Decisão registrada em ADR-016.

### `opis/json-schema`
**O que é:** validador de JSON Schema — vai validar o AST recebido (`Version.ast`) contra `.specs/schemas/component-ast.schema.json` (BK-002).

**Por que esse e não `justinrainbow/json-schema`:** mais ativamente mantido, suporta drafts atuais do JSON Schema.

### `symfony/messenger` + `symfony/redis-messenger`
**O que é:** fila assíncrona (Messenger) + o transporte Redis oficial (pacote separado do Symfony, não builtin no `messenger` core). Vai rodar o `CompileVersionHandler` (BK-004).

### `.env.local` (não versionado)
**O que é:** aponta `DATABASE_URL`/`MESSENGER_TRANSPORT_DSN`/`MINIO_*` pro dev-infra pessoal local (`/home/guilherme/pessoal/dev-infra`) — Postgres na porta `55432`, Redis na `56379`, MinIO na `59000` (portas verificadas rodando de verdade, não assumidas). `.env` (versionado, do Flex) mantém os defaults genéricos; `.env.local` é o override real de cada máquina — convenção padrão do próprio Symfony (`.env.local` sempre no `.gitignore` do skeleton, nunca commitado).

---

## Sessão 1 — BK-001: entidades e migration

### `src/Entity/{User,Library,Version,AuditLog}.php`
**O que é:** as 4 tabelas do `BK-001` (`Worklist.md`), uma classe por tabela, atributos Doctrine (`#[ORM\...]`) direto na classe — sem uma camada de "modelo de domínio" separada da entidade Doctrine (decisão pragmática, ADR-017: duplicar isso não paga o custo no tamanho atual do projeto).

**Por que esse formato:**
- `id` é `Uuid` (`symfony/uid`, tipo `uuid` nativo do Postgres) em vez de auto-increment — evita vazar contagem de linhas/ordem de criação em qualquer API pública, e já é o padrão usado no resto do projeto (nada auto-increment em lugar nenhum do Beaconray).
- `metadata`/`ast`/`scopes`/`artifact_paths`/`payload` são `#[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]` — isso é literalmente o que faz o Doctrine gerar `JSONB` (não `JSON` de texto) no Postgres; confirmado no SQL gerado pela migration, não assumido.
- `Version::$ast` **não tem setter** — é passado só no construtor. Isso é o que faz "imutável" (`.specs/versioning-spec.md`) ser verdade em código, não só em prosa: depois de criada, não existe caminho no código pra mudar o AST de uma versão publicada.
- `Library::setCurrentVersion()` tem 2 guard clauses (a versão precisa pertencer à própria `Library`, e precisa estar `compiled`) — é onde a regra de negócio do `.specs/versioning-spec.md` ("só aponta current pra versão compilada") realmente vive. Testado isoladamente (sem precisar do banco): as 2 regras disparam `\DomainException` corretamente.
- `CompileStatus` é um `enum` PHP nativo (backed por `string`), não uma coluna de texto solta — Doctrine mapeia com `enumType: CompileStatus::class`, então um valor inválido nunca chega a existir como estado possível em PHP (o tipo já impede).

**Padrão que segue:** atributos Doctrine direto na entidade é o padrão default de qualquer tutorial/doc oficial do Doctrine+Symfony (https://symfony.com/doc/current/doctrine.html) — a alternativa (mapeamento XML/YAML separado da classe) é considerada legada, ninguém novo usa.

### `src/Repository/{User,Library,Version,AuditLog}Repository.php`
**O que é:** uma classe por entidade, cada uma estendendo `Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository`.

**Por que não uma interface própria (`LibraryRepositoryInterface`) por cima:** o `ServiceEntityRepository` do Doctrine **já é** o Repository Pattern (interface implícita: você troca a implementação trocando o mapeamento Doctrine, não precisa de uma segunda camada de abstração pra isso). Criar uma interface span só pra "seguir hexagonal" foi exatamente o que ADR-017 decidiu não fazer.

### `migrations/Version20260814034104.php`
**O que é:** gerada por `php bin/console doctrine:migrations:diff` a partir das 4 entidades acima (mais as 5 tabelas que o `league/oauth2-server-bundle` já traz mapeadas sozinho — `oauth2_client`, `oauth2_access_token`, etc., não foi preciso escrever nada pra isso).

**O que eu adicionei à mão:** os 4 índices GIN (`idx_libraries_metadata_gin`, `idx_versions_ast_gin`, `idx_libraries_name_trgm`, `idx_libraries_description_trgm`) — o Doctrine não tem atributo nativo pra índice GIN, então isso não sai do `diff` sozinho; entra como SQL puro dentro do `up()` gerado. `_trgm` usa `pg_trgm` (habilitado no dev-infra pessoal, ver `postgres/init/00-extensions.sql` naquele repo) pra busca fuzzy por nome/descrição de `Library`.

**Rodada e confirmada de verdade** contra o Postgres real do dev-infra pessoal (`php bin/console doctrine:migrations:migrate`), índices GIN conferidos via `\d libraries`/`\d versions` no `psql` — não assumido, checado.

**Padrão que segue:** `doctrine:migrations:diff` é o fluxo oficial recomendado pelo Doctrine Migrations Bundle (https://symfony.com/bundles/DoctrineMigrationsBundle/current/index.html) — gerar a partir da entidade em vez de escrever SQL de migration à mão do zero.

---

## Sessão 1 — BK-003: `ArtifactStorage`

### `src/Storage/ArtifactStorageInterface.php` + `MinioArtifactStorage.php`
**O que é:** a interface (porta) com 4 métodos (`putArtifact`, `getPresignedDownloadUrl`, `getPresignedUploadUrl`, `deleteArtifact`) e a única implementação real, usando `Aws\S3\S3Client` contra o MinIO (que fala o protocolo S3).

**Por que interface + 1 implementação só (não "over-engineering"):** aqui a interface não é dogma hexagonal — é o que deixa o resto do backend (o `CompileVersionHandler` do BK-004, por exemplo) depender de "um lugar que guarda artefato" sem saber que é MinIO especificamente. Trocar de MinIO pra S3 real de produção depois é trocar só esse arquivo.

**`#[Autowire(env: '...')]` nos parâmetros do construtor:** em vez de configurar isso em `services.yaml` com `bind:`/`arguments:`, os valores de `.env` (`MINIO_ENDPOINT`, `MINIO_REGION`, etc.) são injetados direto nos parâmetros do construtor via atributo — recurso do próprio `symfony/dependency-injection` (desde a 6.1), a forma atual recomendada de injetar valor de env var escalar sem precisar declarar `parameters:`/`arguments:` em YAML pra cada um. `bool:`/`int:` como prefixo no nome da env var são os *processors* nativos do Symfony que fazem cast automático (senão toda env var chega como string).

**Por que `use_path_style_endpoint: true`:** obrigatório pro MinIO — sem isso o SDK monta URL no formato `bucket.endpoint.com` (virtual-hosted style, o jeito real da AWS), que o MinIO local não resolve.

**`services.yaml` — 1 linha:** `App\Storage\ArtifactStorageInterface: '@App\Storage\MinioArtifactStorage'` — o único jeito de fato necessário em YAML aqui é dizer "quem implementa essa interface" (Symfony não adivinha sozinho quando é uma interface, mesmo com autowire ligado). Confirmado via `php bin/console debug:container App\Storage\ArtifactStorageInterface` que resolve certo.

**Testado de verdade, ponta a ponta, contra o MinIO real do dev-infra pessoal:** upload (`putObject`) → gerar URL pré-assinada (`createPresignedRequest`, `X-Amz-Expires=180` confirmado na URL — bate com `ARTIFACT_PRESIGN_TTL`) → `GET` real via `curl` na URL, conteúdo batendo → `deleteObject`. Nenhum desses 4 passos foi assumido, todos rodaram de verdade.

---

## Sessão 1 — BK-002: validação de AST

### `src/Validator/AstSchema.php` + `AstSchemaValidator.php`
**O que é:** uma **constraint** do Symfony Validator (não um middleware/event subscriber) — `AstSchema` é o atributo que você põe numa propriedade (`#[AstSchema]` em `Version::$ast`), `AstSchemaValidator` é quem sabe checar de verdade, via `opis/json-schema` contra `.specs/schemas/component-ast.schema.json`.

**Por que constraint e não middleware:** o pipeline de escrita do API Platform já roda o Symfony Validator automaticamente em todo `POST`/`PUT`/`PATCH` (deserialize → **validate** → persist) — colocar a regra numa constraint significa que ela roda de graça nesse pipeline, sem escrever nenhum listener/subscriber novo. Um middleware customizado estaria duplicando um mecanismo que o framework já dá.

**Por que não dá pra usar `%kernel.project_dir%` sozinho:** o schema mora fora de `app/backend` (em `.specs/schemas/`, na raiz do repo Beaconray — é compartilhado com o compiler Node, não é exclusivo do backend). `#[Autowire('%kernel.project_dir%/../../.specs/schemas/component-ast.schema.json')]` no construtor resolve isso subindo 2 níveis a partir de `app/backend`.

**Detalhe que não funcionou de primeira, documentado aqui pra não repetir o erro:** passar `'file://' . $path` direto pro `Validator::validate()` do Opis falhou ("Schema not found") — o resolver de URI do Opis não estava configurado pra isso. Solução: decodificar o arquivo JSON Schema você mesmo (`json_decode(file_get_contents(...))`) e passar o objeto decodificado direto pro `validate()`, em vez de uma URI. Confirmado rodando de verdade.

**Testado de verdade** (via um command Symfony temporário, removido depois de confirmar): `compiler/examples/button.ast.json` real → 0 violações; um AST inventado sem `root` → 1 violação, mensagem `The required properties (root) are missing` — exatamente o comportamento esperado, uma AST inválida nunca chega no `persist()` do Doctrine.

---

## Sessão 1 — BK-004: `CompileVersionHandler`

### `src/Message/CompileVersionMessage.php`
**O que é:** a mensagem — só carrega `versionId` (string, não o objeto `Version` inteiro). Mensagem do Messenger precisa ser serializável pra atravessar o transporte (Redis); carregar só o ID e buscar a entidade de novo dentro do handler é o padrão recomendado (evita serializar estado de entidade Doctrine, que pode ficar desatualizado entre o momento em que a mensagem é despachada e o momento em que é processada).

### `src/MessageHandler/CompileVersionHandler.php`
**O que é:** o handler (`#[AsMessageHandler]` é o que registra ele automaticamente pra consumir `CompileVersionMessage` — não precisa configurar nada em YAML pra isso, o atributo já basta).

**O fluxo:** marca `compiling` → escreve a AST num arquivo temporário → roda `node compiler/dist/compile.js <arquivo>` via `Symfony\Component\Process\Process` → lê `stdout`/`stderr` procurando `[ok]`/`[fail]`/`[abort]` (o mesmo contrato que `compile.ts` já emitia antes de qualquer backend existir) → se `[abort]` (AST estruturalmente inválida — não devia nem ter chegado aqui, já que o `BK-002` valida antes), `UnrecoverableMessageHandlingException` (nunca tenta de novo, não adianta) → se falha de processo (Node crashou, timeout), exceção normal (Messenger tenta de novo sozinho, configurado em `messenger.yaml`) → se deu certo, sobe cada arquivo de output (`react/vue/astro/qa/mitosis`) pro MinIO via `ArtifactStorageInterface` (BK-003) e marca `compiled` com o mapa de `object key` por alvo.

**`config/packages/messenger.yaml`:** `retry_strategy` (3 tentativas, atraso 2s dobrando a cada vez) + `failure_transport: failed` (fila separada pra mensagem que esgotou as tentativas — nada se perde silenciosamente). Rota `App\Message\CompileVersionMessage` pro transporte `async` (Redis, `MESSENGER_TRANSPORT_DSN`).

**Testado de verdade, ponta a ponta** (via command temporário, removido): criou `User`+`Library`+`Version` reais no Postgres → invocou o handler direto (sem passar pelo transporte, pra testar a lógica isolada) → `node compiler/dist/compile.js` rodou de verdade → os 5 arquivos de output (`.lite.tsx`, `react/`, `vue/`, `astro/`, `qa/`) subiram pro MinIO real → `Version` foi de `pending` pra `compiled` com os 5 `object keys` certos → baixado de volta um dos artefatos (`react/Button.tsx`) via URL pré-assinada, conteúdo batendo com o esperado. Dados de teste removidos do Postgres e do MinIO depois de confirmar.

---

## Sessão 1 — BK-005: endpoints CLI + OAuth2 por escopo

### `config/packages/league_oauth2_server.yaml` + chave assimétrica
**O que é:** `php bin/console league:oauth2-server:generate-keypair` gerou o par de chaves (`config/jwt/{private,public}.pem`) que o servidor OAuth2 usa pra assinar/validar token (JWT). Escopos disponíveis trocados do exemplo do bundle (`email`) pros nossos de verdade: `components_read`/`components_write`.

**Por que sem hífen/dois-pontos no nome do escopo:** o bundle vira automaticamente cada escopo concedido numa role Symfony `ROLE_OAUTH2_<ESCOPO EM MAIUSCULO>` — usar `components:read` viraria `ROLE_OAUTH2_COMPONENTS:READ`, um nome de role tecnicamente válido mas estranho de sobra em `access_control`/`#[IsGranted]`. `components_read` vira `ROLE_OAUTH2_COMPONENTS_READ`, mais idiomático.

### `config/packages/security.yaml`
**O que é:** 2 firewalls novos — `oauth_token` (`^/token$`, público, é onde o cliente troca `client_id`+`client_secret` por um access token) e `cli` (`^/v1/cli`, `oauth2: true`, `stateless: true` — cada request se autentica de novo via o Bearer token, sem sessão). `access_control` exige `ROLE_OAUTH2_COMPONENTS_READ` pra qualquer coisa em `/v1/cli` — quem tem token válido com esse escopo (o escopo default) passa.

**Sobre o `ScopeVoter` que eu tinha planejado e não escrevi:** o `league/oauth2-server-bundle` já concede `ROLE_OAUTH2_<escopo>` automaticamente pra cada escopo do token — isso **já é** o controle de acesso por escopo que o `BK-005` pede. Escrever um Voter customizado por cima seria duplicar um mecanismo que o bundle já dá de graça — foi exatamente o tipo de abstração redundante que a ADR-017 decidiu evitar. `access_control`/`#[IsGranted('ROLE_OAUTH2_...')]` bastam.

### `src/ApiResource/Handshake.php` + `State/Provider/HandshakeProvider.php`
**O que é:** `Handshake` é um DTO puro (não é uma entidade Doctrine) marcado `#[ApiResource]` com uma única operação `Get` — o exemplo mais direto do padrão "DTO as Resource" da API Platform (`.specs/backend-architecture-spec.md`): não existe uma "tabela handshake", então não faz sentido nenhum ser uma entidade. O `HandshakeProvider` (`ApiPlatform\State\ProviderInterface`) é quem monta a resposta lendo o token de segurança atual.

**Bug real encontrado testando, não hipotético:** a primeira versão lia `$user->getEmail()` assumindo que quem autentica sempre é o nosso `App\Entity\User`. Testando de verdade com um client `client_credentials` (que é exatamente como uma CLI/pipeline se autentica — sem usuário humano por trás), o Symfony autentica como `League\Bundle\OAuth2ServerBundle\Security\User\ClientCredentialsUser`, que não tem `getEmail()` — erro 500 real, confirmado. Corrigido usando `getUserIdentifier()` (método que **todo** `UserInterface` do Symfony tem, incluindo esse), e o campo do DTO renomeado de `userEmail` pra `identifier` pra refletir que nem sempre é um e-mail.

### `src/ApiResource/VersionDownload.php` + `State/Provider/VersionDownloadProvider.php`
**O que é:** outro DTO-as-Resource — a resposta é `{ target, url, expiresInSeconds }`, nunca os bytes do arquivo (o CLI baixa depois direto do MinIO usando essa URL). `target` vem de query string (`?target=react`, default `react`) — simplificação deliberada: ainda não existe um `.tar.gz` combinando todos os alvos (isso é trabalho futuro do `CLI-002`/compiler, não deste backend).

**Não confunda com a rota estar "quebrada":** testar via `php -S` (servidor embutido do PHP) deu 404 nessa rota especificamente — descoberto ser uma peculiaridade conhecida do servidor embutido com paths contendo múltiplos pontos (`1.0.0`), **não** um bug de rota. Confirmado com `php bin/console router:match` (rota bate certinho) e testando via `$kernel->handle()` direto (o mesmo caminho que roda atrás de um php-fpm/nginx de verdade) — 200, URL pré-assinada real, artefato baixado com sucesso.

### `src/Entity/Library.php` — `#[ApiResource]` direto na entidade
**O que é:** `Library` ganhou `#[ApiResource]` com duas operações (`GetCollection` em `/v1/cli/components`, `Get` em `/v1/cli/components/{slug}`) — sem DTO separado, usando o provider Doctrine nativo do API Platform.

**Por que direto na entidade (e não um DTO) aqui, mas DTO no handshake/download:** essa é exatamente a distinção que `.specs/backend-architecture-spec.md`/ADR-017 já registrava — quando o contrato público não precisa divergir do modelo interno, expor a entidade direto é o caminho "rápido" que a própria documentação da API Platform recomenda; um DTO só entra quando tem motivo real pra existir (handshake não é uma entidade; download não expõe o objeto inteiro, só uma URL).

**`slug` como identificador da API, `id` (UUID) não:** `#[ApiProperty(identifier: true)]` em `slug` e `identifier: false` em `id` — a URL pública usa `/components/button`, não `/components/e10f1727-...`; mais legível, e é o slug que o CLI (`npx beaconray add <slug>`) já usa.

**`#[Ignore]` em `user`/`versions`/`currentVersion`:** evita a API tentar serializar essas relações inteiras (o `User` nem é um `ApiResource`, serializar ele por engano vazaria campos internos). No lugar, um getter simples `getCurrentVersionSemver(): ?string` expõe só o dado que interessa pro CLI (qual versão é a atual).

### Testado de verdade, ponta a ponta, via `$kernel->handle()` direto (não via `php -S`, pela peculiaridade acima)
1. `php bin/console league:oauth2-server:create-client` criou um client real de teste.
2. `POST /token` com `grant_type=client_credentials` → token JWT real emitido.
3. Sem token / token inválido em `/v1/cli/components` → **401** confirmado.
4. Com token válido → `/v1/cli/components` real (`totalItems`, `member`), `/v1/cli/components/button` real, `/v1/cli/handshake` real (`identifier`, `scopes`).
5. `/v1/cli/components/button/versions/1.0.0/download?target=react` → URL pré-assinada real → baixada com `curl`, conteúdo batendo com o artefato do BK-004.
6. Tudo limpo depois (linhas do Postgres, objetos do MinIO, client OAuth2 de teste deletado).
