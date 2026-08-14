# Spec — Component Versioning (`versioning-spec`)

## Context
Every `Library` (catalog item — `Worklist.md` `BK-001`) can have multiple published `Version`s. Beaconray's own CLI design (`CLI-002`: `npx beaconray add <slug>`, downloading a tarball via a presigned URL) is deliberately npm-shaped, so the versioning model follows the same convention users already know from that ecosystem rather than inventing a new one.

## Model
- **Explicit semver per publish.** The publisher chooses the version string (`1.0.0`, `1.1.0`, `2.0.0-beta.1`, ...) at publish time — the system does not auto-increment. A publish is rejected if the given semver is not strictly greater than every existing version of the same `Library` (same rule a package registry enforces).
- **Immutable, append-only.** Once a `Version` is created, its `ast` field never changes. Publishing a change to a component always creates a new `Version` row — never an update to an existing one. This is what makes a `Version` a safe, stable thing for a CLI install to pin to.
- **One "current" pointer per `Library`.** `Library::$currentVersionId` marks the version a plain `npx beaconray add <slug>` (no version specified) installs. Rolling back is repointing this FK to an earlier `Version` — no data is deleted or overwritten.
- **A `Version` can only become `current` once `compile_status = compiled`.** Never point `current` at a version still `pending`/`compiling`, or one that `failed` — enforced at the point `currentVersionId` is set (application-level check, not a DB constraint, since the compile step is async and happens after the row already exists).
- **Full history stays queryable**, not just the current version — `GET /v1/cli/components/{slug}/versions` (BK-005) lists all versions of a `Library` regardless of which one is current.

## `Version` fields (backs `BK-001`'s `versions` table)
- `id` (uuid)
- `library_id` (FK)
- `semver` (string, validated format, unique per `library_id`)
- `ast` (jsonb, GIN-indexed — validated against `.specs/schemas/component-ast.schema.json` before insert, `BK-002`)
- `compile_status` (enum: `pending` | `compiling` | `compiled` | `failed`)
- `artifact_paths` (jsonb — map of compile target → MinIO object key, populated once `compiled`)
- `compiled_at` (nullable timestamp)
- `created_at`

## Non-goals (this version)
- No draft/publish distinction — a `Version` exists the moment it's created (goes straight to `pending` compile status); there's no "unpublished draft" state a user can edit before it becomes real. Revisit if that workflow turns out to be needed once the Studio (`ST-001`/`002`) exists.
- No per-version deprecation flag or changelog text field yet — tracked, add when there's a real use case driving the shape rather than guessing the fields now.
- No branching/pre-release channel model beyond whatever a semver pre-release tag (`-beta.1`) already expresses structurally — no separate "channel" concept.
