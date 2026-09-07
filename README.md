# FitSphere — Local Development Environment

FitSphere is an AI-augmented fitness and gym management platform. This repository contains the local development environment configured to run 100% locally and free of cloud dependencies.

---

## 🏗️ Architecture Overview

The local stack is composed of:

* **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite (`http://localhost:5173`)
* **Backend**: Python 3.9+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, JWT authentication & bcrypt (`http://localhost:8000`)
* **Database**: PostgreSQL 16 (running via Docker on `localhost:5432`)
* **Infrastructure Ready**:
  * **Redis 7** (`localhost:6379`)
  * **RabbitMQ 3 Management** (AMQP: `localhost:5672`, Web UI: `http://localhost:15672`)

---

## 🚀 Quick Start Guide

### Prerequisites

* macOS with Apple Silicon or Intel
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Must be started)
* Node.js v20+ & npm (Node v22 installed)
* Python 3.9+ (Virtual environment initialized in `backend/.venv`)

---

### Step 1: Start Infrastructure Services (Docker)

Ensure Docker Desktop is running on your Mac, then launch PostgreSQL, Redis, and RabbitMQ:

```bash
# Using Makefile
make dev-services

# Or directly using Docker Compose
docker compose up -d
```

Services exposed:
* **PostgreSQL**: `localhost:5432` (User: `fitsphere_user`, DB: `fitsphere_db`)
* **Redis**: `localhost:6379`
* **RabbitMQ AMQP**: `localhost:5672`
* **RabbitMQ Management Dashboard**: [http://localhost:15672](http://localhost:15672) (User: `fitsphere_user`, Pass: `fitsphere_local_password`)

---

### Step 2: Start the Backend (FastAPI)

```bash
# Using Makefile
make dev-backend

# Or directly:
source backend/.venv/bin/activate
PYTHONPATH=backend uvicorn app.main:app --reload --port 8000
```

Access:
* Interactive Swagger API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
* ReDoc API Docs: [http://localhost:8000/redoc](http://localhost:8000/redoc)
* Health Check Endpoint: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

### Step 3: Start the Frontend (React + Vite)

Open a new terminal tab and start the frontend development server:

```bash
# Using Makefile
make dev-frontend

# Or directly:
cd frontend
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) to see the FitSphere Development Dashboard and live service health monitor.

---

## 🗄️ Database Migrations (Alembic)

To generate a new migration after creating SQLAlchemy models:

```bash
cd backend
alembic revision --autogenerate -m "describe changes"
```

To apply migrations to your local PostgreSQL database:

```bash
make migrate
# Or:
backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
```

---

## 📂 Project Structure

```
GymPro/ (FitSphere)
├── backend/
│   ├── app/
│   │   ├── api/v1/              # API endpoints (health check, v1 router)
│   │   ├── core/                # App config (Pydantic Settings), security (JWT, bcrypt)
│   │   ├── db/                  # SQLAlchemy Base, Engine, SessionLocal
│   │   ├── models/              # Declarative database models
│   │   ├── schemas/             # Pydantic validation schemas
│   │   └── main.py              # FastAPI application entrypoint & CORS
│   ├── alembic/                 # Migration environment & versions
│   ├── alembic.ini              # Alembic configuration
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile               # Backend container definition
│   └── .venv/                   # Python virtual environment (ignored in git)
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Interactive developer dashboard
│   │   ├── index.css            # Tailwind CSS foundation
│   │   └── main.tsx             # React mount
│   ├── vite.config.ts           # Vite + Tailwind + backend API proxy
│   ├── package.json             # Frontend dependencies & scripts
│   └── tsconfig.json            # TypeScript configuration
├── docker-compose.yml           # PostgreSQL, Redis, RabbitMQ services
├── .env.example                 # Root environment template
├── .gitignore                   # Monorepo git ignore
├── Makefile                     # Shortcut developer commands
└── README.md                    # This documentation
```
