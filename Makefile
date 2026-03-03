.PHONY: dev backend frontend pull-models test lint install setup

# ── Development ────────────────────────────────────────────────────────────

## Start everything with Docker Compose (Ollama + backend + frontend)
dev:
	docker compose -f infra/docker-compose.yml up --build

## Start only the FastAPI backend locally (no Docker)
backend:
	uvicorn apps.mcp_server.main:app --reload --port 8000

## Start only the Vite frontend locally (no Docker)
frontend:
	cd apps/frontend && npm run dev

# ── Python setup ───────────────────────────────────────────────────────────

## Install Python dependencies
install:
	pip install -e ".[dev]"

## Install frontend dependencies
install-frontend:
	cd apps/frontend && npm install

## Run everything setup in one shot
setup: install install-frontend
	cp -n .env.example .env || true
	@echo "\n✅ Setup done. Edit .env with YOUR KEYS, then: make dev"

# ── Testing ────────────────────────────────────────────────────────────────

## Run Python unit tests
test:
	pytest tests/ -v

## Run a single test file: make test-file FILE=tests/test_vision_agent.py
test-file:
	pytest $(FILE) -v

# ── Linting ────────────────────────────────────────────────────────────────

## Lint and auto-fix Python code
lint:
	ruff check . --fix
	ruff format .

## Type-check frontend
lint-frontend:
	cd apps/frontend && npx tsc --noEmit
