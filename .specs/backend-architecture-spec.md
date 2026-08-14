# Spec — Backend Architecture (`backend-architecture-spec`)

## Context
Covers `BK-001`..`BK-005` (`Worklist.md`) — the Symfony backend (`app/backend`) that stores components/versions, validates incoming ASTs, stores compiled artifacts, compiles versions asynchronously, and exposes the CLI's REST endpoints. Pulled forward from Fase 3 to now (ADR-015). Structure decision (flat, no domain modules) is ADR-017; library/package choices are ADR-016 — this spec describes the resulting shape, not the reasoning (see the ADRs for that).

## Structure
`app/backend/src/`, flat by technical kind — no domain/module folders:
- `Entity/` — `Library`, `Version`, `User`, `AuditLog`. Doctrine attributes directly on the entity (pragmatic — no separate persistence model).
- `Repository/` — `LibraryRepository`, `VersionRepository`, extending Doctrine's `ServiceEntityRepository` directly.
- `ApiResource/` — DTO-as-Resource classes, only where the public API contract must diverge from the Doctrine entity (e.g. the `/v1/cli/handshake` response).
- `State/Provider/`, `State/Processor/` — custom API Platform state providers/processors, only where the built-in Doctrine provider/processor doesn't fit (the `/v1/cli/*` custom operations).
- `MessageHandler/` — `CompileVersionHandler` (BK-004).
- `Validator/` — `AstSchemaConstraint` + `AstSchemaValidator` (BK-002).
- `Storage/` — `ArtifactStorageInterface` + `MinioArtifactStorage` (BK-003).
- `Security/Voter/` — `ScopeVoter` (BK-005).

Every file added here gets an entry in `app/backend/SYMFONY_GUIDE.md` (what/why/where/which Symfony-community pattern) — no inline explanatory comments in the code itself.

## Data model (BK-001)
Four tables, `jsonb` columns via Doctrine's `Types::JSON` with `options: ['jsonb' => true]`:
- `users` — `id` (uuid), `email` (unique), `password_hash` (nullable — OAuth2-only accounts may have none), `scopes` (jsonb array), timestamps.
- `libraries` — `id` (uuid), `user_id` (FK), `slug` (unique per user), `name`, `description`, `metadata` (jsonb, GIN), `current_version_id` (FK, nullable), timestamps. GIN+trigram index on `name`/`description` for fuzzy search (`pg_trgm`, see `.specs/versioning-spec.md`'s sibling infra note in ADR-018).
- `versions` — see `.specs/versioning-spec.md` for the full model (semver, immutability, `compile_status`).
- `audit_logs` — `id` (uuid), `user_id` (FK, nullable), `action`, `entity_type`, `entity_id`, `payload` (jsonb), `ip_address`, `created_at`.

GIN indexes have no native Doctrine migration attribute — added as raw SQL inside the migration's `up()` (`CREATE INDEX ... USING GIN (...)`).

## AST validation (BK-002)
`Validator/AstSchemaValidator` validates `Version::$ast` against `.specs/schemas/component-ast.schema.json` (via `opis/json-schema`) as a Symfony Validator constraint — runs automatically in API Platform's standard write pipeline (deserialize → validate → persist), no custom event subscriber needed. A malformed/malicious AST fails at the Validator stage (422) before touching Doctrine's `persist()`. The schema file is the single source of truth mirrored from `ast-component-spec.md` — any AST format change updates both together.

## Artifact storage (BK-003)
`Storage/ArtifactStorageInterface` (`putArtifact`, `getPresignedDownloadUrl`, `getPresignedUploadUrl`, `deleteArtifact`) backed by `Storage/MinioArtifactStorage` using `Aws\S3\S3Client` (`use_path_style_endpoint: true`, required for MinIO). Presigned URL TTL defaults to 180 seconds (`ARTIFACT_PRESIGN_TTL` env var, not hardcoded). "Artifact" = the compiled output files a `Version` produces (`.lite.tsx`, `react/*.tsx`, `vue/*.vue`, `astro/*.astro`, `qa/*.html`) — distinct from the `Version` row itself, which is just the Postgres AST/metadata record.

## Compilation (BK-004)
`MessageHandler/CompileVersionHandler` (Symfony Messenger, Redis transport) shells out to the existing Node pipeline: `new Process(['node', '<repo>/compiler/dist/compile.js', $tmpAstFile])`, parsing the same `[ok]`/`[fail]`/`[abort]` stdout/stderr lines `compile.ts` already emits — no changes to the Node side. `[abort]` (a structurally/quality-gate-invalid AST — should already have been caught by BK-002, so seeing one here is itself a signal worth logging loudly) throws `UnrecoverableMessageHandlingException` (never retried). Any other failure (process crash, timeout) throws a plain exception, retried per Messenger's configured strategy (3 attempts, exponential backoff), landing in a `failed` transport if exhausted. On success, compiled output files are uploaded via `ArtifactStorageInterface`, `Version::$compileStatus` moves to `compiled`, `Version::$artifactPaths` records the MinIO object keys per target.

## CLI endpoints (BK-005)
`/v1/cli/handshake` (validates a bearer token, returns protocol version + user + scopes) and `/v1/cli/components/*` (list/get `Library` metadata, plus a `/versions/{semver}/download` route returning a presigned URL — never the file bytes directly, matching `CLI-002`'s design). Both are API Platform custom operations (`ApiResource/`, `State/Provider`), not auto-CRUD resources. Security: `league/oauth2-server-bundle`'s resource-server authenticator on the `/v1/cli/` firewall, scope enforcement via `Security/Voter/ScopeVoter` checking the token's `scopes` claim against a `#[IsGranted('SCOPE_...')]` attribute per operation.

## Non-goals (this version)
- Table partitioning by user ID (mentioned in `Roadmap.md`) — premature on a schema with no real rows yet; revisit once volume justifies it.
- Webhook delivery retries for BK-004's status callback to the Studio — Studio (`ST-001`/`002`) doesn't exist yet; the webhook call is best-effort, not queued/retried separately. A failed webhook delivery must never undo an already-persisted `compiled` status.
- Kubernetes production manifests — tracked separately (`Roadmap.md` Fase E), not part of this spec.
