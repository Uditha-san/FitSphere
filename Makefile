.PHONY: help dev-services dev-backend dev-frontend stop-services test-health migrate

help:
	@echo "FitSphere Development Commands:"
	@echo "  make dev-services    - Start local PostgreSQL, Redis, and RabbitMQ via Docker"
	@echo "  make stop-services   - Stop Docker background services"
	@echo "  make dev-backend     - Start FastAPI backend with live reload (http://localhost:8000)"
	@echo "  make dev-frontend    - Start Vite React frontend (http://localhost:5173)"
	@echo "  make migrate         - Apply database migrations with Alembic"
	@echo "  make test-backend    - Run backend import & security tests"

dev-services:
	docker compose up -d

stop-services:
	docker compose down

dev-backend:
	PYTHONPATH=backend ./backend/.venv/bin/uvicorn app.main:app --reload --port 8000 --host 0.0.0.0

dev-frontend:
	npm --prefix frontend run dev

migrate:
	PYTHONPATH=backend ./backend/.venv/bin/alembic -c backend/alembic.ini upgrade head

test-backend:
	PYTHONPATH=backend ./backend/.venv/bin/python -c "import app.main, app.core.security; print('All backend modules loaded cleanly!')"
