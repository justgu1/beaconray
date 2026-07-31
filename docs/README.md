# Documentation

This directory contains human-oriented documentation.

## Purpose

Documentation in this directory explains:

- System behavior
- Product concepts
- User flows
- Business rules
- Examples

The goal is understanding, not implementation.

---

## Source of Truth

Documentation must be derived from:

```text
.specs/

Specifications remain the authoritative source.

Whenever specifications change, documentation should be reviewed and updated.

Structure
docs/

index.html

modules/
├── module-a.html
├── module-b.html
└── ...
Audience

This documentation is intended for:

Developers
Product teams
Stakeholders
Architects
Maintainers
Guidelines

Prefer:

Explanations
Diagrams
Examples
Business language

Avoid:

Source code duplication
Internal implementation details
Technical contracts copied from .specs