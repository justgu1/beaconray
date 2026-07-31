# CONTEXT

## ARCHITECTURE

style:
- modular-monilith

layers:
- presentation
- application
- domain
- infrastructure

## STACK

runtime:
framework:
database:
infra:

## LANGUAGE

code: en
comments: en
specs: en
docs: pt-BR

## NAMING

files: kebab-case
classes: PascalCase
functions: camelCase
variables: camelCase
constants: UPPER_SNAKE_CASE

## GLOBAL_CONSTRAINTS

security:
- validate-input-at-boundary
- never-log-sensitive-data

performance:
- indexed-queries
- paginated-lists

observability:
- trace-id-required
- structured-logging

## ADRS

### ADR-001

status:
date:
decision:
reason:
consequences:

## INTEGRATIONS

| service | purpose | owner |
|----------|----------|----------|

## GLOSSARY

| term | definition |
|----------|----------|