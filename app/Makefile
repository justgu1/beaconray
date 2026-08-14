SHELL := /bin/bash
.SHELLFLAGS := -ec

BACKEND_PORT ?= 8123
FRONTEND_PORT ?= 4321

.PHONY: up compiler build-frontend down

# Starts backend + frontend together, logs from both interleaved live in this
# same terminal (prefixed [backend]/[frontend]) — Ctrl+C stops both (real
# terminal job control). If anything lingers after Ctrl+C, `make down` is the
# guaranteed cleanup (kills by command pattern, not PID-dependent).
# `astro dev`'s own background-server mode is unreliable in some sandboxed
# environments (confirmed: fails silently) — `astro build` + `astro preview`
# is used instead, reliable, just without hot-reload; re-run `make up` after
# editing frontend source to pick up changes.
up: build-frontend
	@trap 'kill 0' INT TERM EXIT; \
	(cd backend && php -S 127.0.0.1:$(BACKEND_PORT) -t public public/index.php 2>&1 | sed -u 's/^/[backend] /') & \
	(cd frontend && npx astro preview --port $(FRONTEND_PORT) 2>&1 | sed -u 's/^/[frontend] /') & \
	wait

compiler:
	cd ../compiler && npm run build --silent
	cd ../compiler && node dist/compile.js examples/button.ast.json
	cd ../compiler && node dist/compile.js examples/counter.ast.json
	cd ../compiler && node dist/compile.js examples/save-status.ast.json

build-frontend: compiler
	cd frontend && npm run build --silent

down:
	@pkill -f "php -S 127.0.0.1:$(BACKEND_PORT)" 2>/dev/null || true
	@pkill -f "astro preview" 2>/dev/null || true
	@echo "stopped"
