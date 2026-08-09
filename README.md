# SUNLINE — Monorepo

Premium Tunisian women's denim e-commerce platform.

```
sunline-project/
├── frontend/     Next.js + TypeScript + Tailwind + shadcn/ui
├── backend/      FastAPI + SQLAlchemy + PostgreSQL + Redis
└── docker-compose.yml   Local Postgres + Redis
```

## Phase 0 — Getting Running Locally

### 1. Start infrastructure (Postgres + Redis)

```bash
docker compose up -d
```

Check both are healthy:
```bash
docker ps
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Visit **http://localhost:8000/docs** — you should see the FastAPI Swagger UI.
Visit **http://localhost:8000/api/health** — should return `{"status":"ok","database":"ok","redis":"ok"}`.

If database or redis show an error, docker-compose isn't running or `.env` doesn't match — check `DATABASE_URL` and `REDIS_URL`.

### 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Visit **http://localhost:3000** — you should see the SUNLINE placeholder homepage.
Click "Check API Connection" — it should hit the backend health endpoint.

### 4. Add your first shadcn/ui components

```bash
cd frontend
npx shadcn@latest add button card input badge accordion dialog select label
```

These land in `src/components/ui/` and are yours to edit — shadcn is not a package dependency, it copies code into your repo.

## What's next (Phase 1)

- Design the PostgreSQL schema (products, variants, orders, users, carts)
- Write SQLAlchemy models in `backend/app/models/`
- First Alembic migration: `alembic revision --autogenerate -m "initial schema"`
- Build the `/api/products` router with real data

## Notes

- Brand colors are defined once in `frontend/tailwind.config.ts` (`ink`, `lavender`, `gray`, `ivory`) — always use these Tailwind classes (`bg-ink`, `text-lavender`, etc.), never hardcode hex values in components.
- Backend config lives in `backend/app/core/config.py`, reading from `.env` — never commit `.env`, only `.env.example`.
