.PHONY: help dev-services dev-backend dev-frontend stop-services test-health migrate seed test-all

help:
	@echo "FitSphere Development Commands:"
	@echo "  make dev-services    - Start local PostgreSQL, Redis, and RabbitMQ via Docker"
	@echo "  make stop-services   - Stop Docker background services"
	@echo "  make dev-backend     - Start FastAPI backend with live reload (http://localhost:8000)"
	@echo "  make dev-frontend    - Start Vite React frontend (http://localhost:5173)"
	@echo "  make migrate         - Apply database migrations with Alembic"
	@echo "  make seed            - Seed local database with default test accounts"
	@echo "  make test-backend    - Run backend import & security tests"
	@echo "  make test-all        - Run complete automated regression test suite"

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

seed:
	PYTHONPATH=backend ./backend/.venv/bin/python backend/scripts/seed_dev_data.py

test-backend:
	PYTHONPATH=backend ./backend/.venv/bin/python -c "import app.main, app.core.security; print('All backend modules loaded cleanly!')"

test-all:
	PYTHONPATH=backend ./backend/.venv/bin/python backend/tests/test_training_plans.py
	PYTHONPATH=backend ./backend/.venv/bin/python backend/tests/test_coach_client_assignment.py
	PYTHONPATH=backend ./backend/.venv/bin/python backend/tests/test_authorization_rbac.py
	PYTHONPATH=backend ./backend/.venv/bin/python backend/tests/test_auth_domain.py
	PYTHONPATH=backend ./backend/.venv/bin/python backend/tests/test_tenant_user_domain.py


