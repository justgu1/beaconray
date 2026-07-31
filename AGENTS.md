# AGENTS

load:
- .specs/INDEX.md
- .specs/CONTEXT.md

workflow:
- load-spec
- load-dependencies
- load-contracts
- load-rules
- load-checklists
- load-skills

rules:
- respect-dependencies
- do-not-implement-draft-work-items
- validate-checklists
- keep-specs-synchronized
- keep-docs-synchronized
- update-changelog
- specs-are-source-of-truth

precedence:
contracts > rules > spec > code > docs