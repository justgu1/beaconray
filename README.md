# AI Specification Template

Specification-first project template designed for human and AI collaboration.

## Purpose

This template separates:

- Implementation context for AI agents
- Human documentation
- Product evolution
- Business contracts
- Module specifications

The goal is to keep context structured, synchronized and token-efficient.

---

## Core Principles

### Single Source of Truth

Every piece of information should have one authoritative location.

| Information | Source |
|-------------|---------|
| Architecture | `.specs/CONTEXT.md` |
| Modules | `.specs/INDEX.md` |
| Module behavior | `spec.md` |
| Business contracts | `contracts/*` |
| Constraints | `rules.md` |
| Validation criteria | `checklists.md` |
| Planned work | `work-items/*` |
| Product history | `CHANGELOG.md` |
| Human documentation | `/docs` |

---

## Repository Structure

```text
.
├── AGENTS.md
├── CHANGELOG.md
├── README.md
│
├── .specs
│   ├── INDEX.md
│   ├── CONTEXT.md
│   ├── SKILLS.md
│   │
│   ├── work-items
│   │
│   └── [module]
│       ├── spec.md
│       ├── rules.md
│       ├── checklists.md
│       └── contracts
│           ├── domain.md
│           ├── api.md
│           └── events.md
│
└── docs
    ├── index.html
    └── modules
```

---

## Development Workflow

```text
Define Module
        ↓
Define Contracts
        ↓
Define Rules
        ↓
Define Checklists
        ↓
Create Work Item
        ↓
Implement
        ↓
Synchronize Artifacts
        ↓
Update Changelog
```

---

## Specifications

Modules represent permanent system knowledge.

A module should define:

- Responsibilities
- Flows
- Entities
- Contracts
- Constraints

Modules do not have lifecycle status.

---

## Work Items

Work items represent temporary changes.

Examples:

- add-user-registration
- add-mfa
- refactor-auth-domain
- migrate-to-postgres

Work items may have:

- status
- priority
- dependencies

Work items are the only artifacts that move through implementation stages.

---

## Documentation

Documentation inside `/docs` is intended for humans.

Documentation inside `.specs` is intended for implementation and decision-making.

Both must remain synchronized.

---

## Best Practices

- Keep specifications concise
- Avoid duplicated information
- Prefer references over copies
- Update artifacts together
- Treat contracts as source of truth
- Treat documentation as a product artifact

---

## Recommendations

### Good

- Small modules
- Explicit contracts
- Independent work items
- Clear acceptance criteria

### Avoid

- Duplicated rules
- Hidden business logic
- Documentation-only features
- Outdated contracts