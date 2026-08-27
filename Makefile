.PHONY: setup test test-api test-web test-mobile dev sync

setup:
	cd services/api && uv sync --dev
	npm install

test: test-api test-web test-mobile

test-api:
	cd services/api && uv run pytest -q

test-web:
	npm --workspace @gushi/admin test -- --run

test-mobile:
	npm --workspace @gushi/mobile test -- --runInBand

dev:
	docker compose -f infra/docker-compose.yml up --build

sync:
	cd services/api && uv run python -m app.worker sync-all
