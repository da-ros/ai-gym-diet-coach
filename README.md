# FuelCoach

**AI dietary coach for gym goers.** Log meals by photo, track macros and protein timing, and get evidence-based nudges to hit 3–4 protein spikes and recover better.

**See demo and full case study:** [pedrorodas.com/#projects](https://pedrorodas.com/#projects)

---

## Table of Contents

- [Project goal](#project-goal)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup & run](#setup--run)
- [Environment variables](#environment-variables)
- [Database migrations (Supabase)](#database-migrations-supabase)
- [Development commands](#development-commands)
- [Project structure](#project-structure)
- [API overview](#api-overview)
- [Testing](#testing)

---

## Project goal

Build a **low-friction, AI-native dietary coach** that lets users:

- **Log meals via photos** — no manual entry; the app identifies foods and estimates portions.
- **Track macros and key micronutrients** — calories, protein, carbs, fats, plus fiber, sodium, and potassium.
- **Optimize Muscle Protein Synthesis (MPS)** — target 3–4 evenly spaced protein feedings (e.g. ≥20g per meal) and see a daily MPS score and timeline.
- **Get smart coaching** — short, evidence-based nudges (e.g. missed spikes, low sodium) and a chat coach grounded in today’s log and MPS timeline.

The product prioritizes **automation, accuracy, and adherence** over exhaustive nutrition tracking.

---

## Features

- **Photo-based logging** — Upload a meal photo; vision and nutrition agents return foods, dish name, and macros/micros.
- **Daily dashboard** — Macros (calories, protein, carbs, fats), MPS score (e.g. 2/4 protein spikes), micronutrient status (fiber, sodium, potassium), and a 4-slot MPS timeline (meal times + next target).
- **Profile & goals** — Goal: bulk, cut, or lean bulk; body weight (kg); auto-calculated protein target (2.2 g/kg) and TDEE-based calorie target.
- **Coach chat** — Ask questions about today’s intake; replies use daily log + MPS timeline; conversation history and timezone-aware spike times.
- **Auth** — Supabase (email/password); JWT verified by the backend (HS256 or JWKS).

---

## Tech stack

| Layer        | Technology |
|-------------|------------|
| Frontend    | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, React Router, Supabase Auth |
| Backend     | Python 3.11+, FastAPI, Uvicorn |
| Orchestration | LangGraph (DAG workflows) |
| AI          | Anthropic Claude (vision + text) |
| Database    | PostgreSQL (Supabase); SQLAlchemy 2 + async-ready patterns |
| Auth        | Supabase Auth; backend verifies JWT (HS256 or JWKS via `SUPABASE_URL`) |

---

## Architecture

The system splits into four layers: a **React PWA** in the browser, a **FastAPI** API, **Supabase** for auth and PostgreSQL, and **LangGraph + agents** backed by the **Anthropic API**.

![System architecture](./CoachGymDiet-architecture-light.png)

**Frontend (React PWA)** — Pages for auth, dashboard, meal logging, chat, and profile. `lib/supabase.ts` handles sign-in; `lib/api.ts` calls the backend with a Bearer JWT. TanStack Query manages server state.

**Backend (FastAPI)** — Routes for meals, summaries, chat, and profile. `auth.py` verifies the Supabase JWT (`sub` → `user_id`). SQLAlchemy reads/writes Postgres; meal photos are stored under `/uploads`.

**Supabase** — Email/password auth issues access tokens; PostgreSQL holds `user_profiles`, `meals`, and `daily_logs`.

**Orchestration & agents** — `POST /meals` triggers `run_meal_flow()` (LangGraph). `vision_agent` and `nutrition_agent` run the meal pipeline; `mps_agent` handles nudges and chat. **Claude Sonnet** powers vision; **Claude Haiku** powers nutrition estimates, coaching, and chat.

### LangGraph meal logging DAG

When the user uploads a photo via **`POST /meals`**, the backend runs **`run_meal_flow()`** in `workflows/graphs/meal_flow.py`. State is carried in **`MealFlowState`** (`workflows/state.py`) from node to node.

```
              POST /meals (image upload)
                       │
                       ▼
          ┌────────────────────────┐
          │      vision_node       │
          └───────────┬────────────┘
                      ▼
          ┌────────────────────────┐
          │     nutrition_node     │
          └───────────┬────────────┘
                      ▼
          ┌────────────────────────┐
          │  update_context_node   │
          └───────────┬────────────┘
                      ▼
          ┌────────────────────────┐
          │     should_coach?      │
          └───────────┬────────────┘
                      │
        ┌─────────────┴─────────────┐
     yes│                           │no
        ▼                           ▼
  ┌────────────────────────┐      END
  │     coaching_node      │
  └───────────┬────────────┘
              ▼
             END
```

| Step | Node | What it does |
|------|------|----------------|
| 1 | **Image upload** | FastAPI saves the photo, passes `image_bytes` + `user_id` into the graph. |
| 2 | **`vision_node`** | Claude (vision) identifies foods, portions, and a dish name from the image. |
| 3 | **`nutrition_node`** | Claude (text) estimates macros (calories, protein, carbs, fats) and micros (fiber, sodium, potassium) from the food list. |
| 4 | **`update_context_node`** | Persists a **`Meal`** row, rolls totals into today’s **`DailyLog`**, flags protein spikes (≥ `PROTEIN_SPIKE_THRESHOLD_G`), and sets `protein_spike_detected` / `deficiency_detected`. |
| 5 | **`should_coach?`** | Conditional edge: if a spike was logged or a micro deficiency heuristic fired, continue; otherwise the graph ends. |
| 6 | **`coaching_node`** | Claude (text) generates a short, evidence-based nudge from profile + daily log; saved on the meal as `nudge`. |

Chat (`POST /chat`) is **outside** this DAG: it uses the same daily context and MPS timeline but does not re-run vision or nutrition.

### Backend layout

- **`apps/mcp_server/`** — FastAPI app, CORS, lifespan (init DB, uploads dir).
  - **`main.py`** — App entry; mounts `/uploads`; registers routes (meals, summary, chat, profile).
  - **`config.py`** — Settings (env): `DATABASE_URL`, `ANTHROPIC_API_KEY`, `SUPABASE_*`, Claude model names, `PROTEIN_SPIKE_THRESHOLD_G` (default 20).
  - **`auth.py`** — JWT validation (Bearer token); supports HS256 (legacy secret) and ES256/RS256 (JWKS from `SUPABASE_URL`); returns `sub` as `user_id`.
  - **`context/`** — `database.py` (engine, session, `init_db`), `models.py` (SQLAlchemy: `UserProfile`, `Meal`, `DailyLog`).
  - **`routes/`** — `meals.py`, `summary.py`, `chat.py`, `profile.py`.
  - **`schemas/`** — Pydantic request/response models for each route.

- **`apps/agents/`** — Domain agents (call Claude).
  - **`vision_agent.py`** — Image → list of foods with portions + dish name (Claude Sonnet).
  - **`nutrition_agent.py`** — Foods → macros (calories, protein, carbs, fats) + micros (fiber, sodium, potassium) (Claude Haiku).
  - **`mps_agent.py`** — Nudges from profile + daily log + spike/deficiency flags; chat replies from daily context + optional timeline summary (Claude Haiku).

- **`workflows/`** — LangGraph DAG.
  - **`state.py`** — `MealFlowState` (user_id, image_bytes, foods, dish_name, macros, micros, meal_id, flags, nudge).
  - **`graphs/meal_flow.py`** — DAG: `vision_node` → `nutrition_node` → `update_context_node` → conditional `coaching_node`; `run_meal_flow()` invoked from `POST /meals`.

### Data model (summary)

- **UserProfile** — `user_id` (PK), `goal`, `body_weight_kg`, `protein_target_g`, `calorie_target`.
- **Meal** — `id`, `user_id`, `logged_at`, `photo_path`, `dish_name`, `foods_identified`, `macros`, `micros`, `protein_g`, `is_protein_spike`, `nudge`.
- **DailyLog** — Per user per day: totals (calories, protein, carbs, fats, fiber, sodium, potassium), `protein_spikes` (list of times), `mps_score` (property: achieved/target 4).

### Frontend layout

- **`apps/frontend/`** — React PWA (Vite, port 8080).
  - **Pages:** Splash, Login, Signup, Dashboard (home), LogMeal, MealDetail, CoachChat, Profile.
  - **Dashboard:** Macro summary, MPS score + 4-slot timeline (filled left-to-right by spikes), micro status, recent meals, Log Meal / Ask Coach.
  - **Profile:** Goal (bulk / cut / lean bulk), body weight (kg), auto protein (2.2 g/kg) and TDEE-based calories; persisted via `PUT /profile`.
  - **Chat:** Messages with history; sends timezone and MPS timeline summary for context; markdown bold for coach replies; daily chat stored in `localStorage` by date.
  - **Auth:** Supabase client; token sent as `Authorization: Bearer <access_token>`; backend validates and uses `sub` as `user_id`.

### MPS and protein spikes

- A meal counts as a **protein spike** if `protein_g >= PROTEIN_SPIKE_THRESHOLD_G` (default **20 g**).
- Daily target: **4** spikes; score = achieved / 4.
- Backend appends spike times to `DailyLog.protein_spikes`; frontend shows a fixed 4-slot timeline (time + label per slot, circles filled left to right).

---

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **Supabase project** (for auth and PostgreSQL)
- **Anthropic API key** (for Claude vision and text)

---

## Setup & run

### 1. Clone and install

```bash
git clone https://github.com/da-ros/ai-gym-diet-coach.git
cd ai-gym-diet-coach
```

### 2. Backend (Python)

```bash
# Create virtualenv (recommended)
python3 -m venv .venv
source .venv/bin/activate   # or: .venv\Scripts\activate on Windows

# Install backend
make install
# or: pip install -e ".[dev]"
```

### 3. Frontend

```bash
make install-frontend
# or: cd apps/frontend && npm install
```

### 4. Environment

```bash
cp .env.example .env
# Edit .env (see [Environment variables](#environment-variables))
```

For the frontend, create `apps/frontend/.env` with at least:

```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 5. Database (Supabase)

- In the Supabase dashboard, create a project and get the **Database** connection string (URI, port 6543 for pooler) and **API** settings (JWT secret, anon key, project URL).
- Run the SQL migrations in **Supabase → SQL Editor** (see [Database migrations](#database-migrations-supabase)).

### 6. Run locally (no Docker)

**Terminal 1 — Backend**

```bash
make backend
# or: uvicorn apps.mcp_server.main:app --reload --port 8000
```

**Terminal 2 — Frontend**

```bash
make frontend
# or: cd apps/frontend && npm run dev
```

- Backend: **http://localhost:8000**
- Frontend: **http://localhost:8080**

### 7. Run with Docker

```bash
make dev
# or: docker compose -f infra/docker-compose.yml up --build
```

- Backend: port **8000**; frontend: port **8080**. Set `VITE_API_URL` in the frontend (or in `infra/docker-compose.yml`) to the host/URL the browser uses to reach the backend.

---

## Environment variables

### Root `.env` (backend)

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key (vision + nutrition + coaching + chat). |
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooler, e.g. `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`). |
| `SUPABASE_JWT_SECRET` | Supabase **Legacy** JWT Secret (Settings → API → JWT Keys). |
| `SUPABASE_URL` | Supabase project URL (e.g. `https://YOUR_PROJECT_REF.supabase.co`) for JWKS verification of ECC-signed tokens. |

Optional/tuning:

- `CLAUDE_VISION_MODEL` — default `claude-sonnet-4-6`.
- `CLAUDE_TEXT_MODEL` — default `claude-haiku-4-5-20251001`.
- `PROTEIN_SPIKE_THRESHOLD_G` — default `20.0`.

### Frontend `apps/frontend/.env`

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend base URL (e.g. `http://localhost:8000`). |
| `VITE_SUPABASE_URL` | Same as backend `SUPABASE_URL`. |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key. |

---

## Database migrations (Supabase)

Run these in **Supabase → SQL Editor** if your schema was created before these columns existed.

**Add `dish_name` to meals**

```sql
ALTER TABLE meals ADD COLUMN IF NOT EXISTS dish_name VARCHAR(128) NULL;
```

**Add `body_weight_kg` to user_profiles**

```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS body_weight_kg DOUBLE PRECISION DEFAULT 75.0;
```

Scripts are also in `data/migrations/` (e.g. `add_dish_name_to_meals.sql`, `add_body_weight_kg_to_user_profiles.sql`).

---

## Development commands

| Command | Description |
|---------|-------------|
| `make setup` | First-time: `make install` + `install-frontend` + copy `.env.example` → `.env`. |
| `make dev` | Start backend + frontend via Docker Compose. |
| `make backend` | Run FastAPI locally on port 8000. |
| `make frontend` | Run Vite dev server on port 8080. |
| `make test` | Run Python tests (`pytest tests/ -v`). |
| `make test-file FILE=tests/test_vision_agent.py` | Run a single test file. |
| `make lint` | Lint and format Python (ruff). |
| `make lint-frontend` | TypeScript type-check (`npx tsc --noEmit`). |

---

## Project structure

```
ai-gym-diet-coach/
├── apps/
│   ├── mcp_server/           # FastAPI backend
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── auth.py
│   │   ├── context/          # DB engine, session, models
│   │   ├── routes/           # meals, summary, chat, profile
│   │   └── schemas/
│   ├── agents/               # Vision, nutrition, MPS/coaching
│   │   ├── vision_agent.py
│   │   ├── nutrition_agent.py
│   │   └── mps_agent.py
│   └── frontend/             # React/Vite PWA
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   └── lib/
│       └── package.json
├── workflows/
│   ├── state.py             # MealFlowState
│   └── graphs/
│       └── meal_flow.py      # LangGraph DAG
├── data/
│   └── migrations/          # SQL for Supabase
├── infra/
│   ├── docker-compose.yml
│   └── Dockerfile.*
├── tests/
├── pyproject.toml
├── Makefile
├── .env.example
└── README.md
```

---

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check. |
| POST | `/meals` | Upload meal photo (multipart); runs LangGraph flow; returns meal + MPS summary. |
| GET | `/meals/{meal_id}` | Get one meal (auth: same user). |
| GET | `/daily-summary` | Today’s totals, MPS score, protein spike times, meals (auth). |
| GET | `/weekly-summary` | Last 7 days macro/MPS summary (auth). |
| GET | `/profile` | Current user profile (auth). |
| PUT | `/profile` | Update goal, body_weight_kg, protein_target_g, calorie_target (auth). |
| POST | `/chat` | Send message; body: `message`, optional `timezone`, `history`, `timeline_summary` (auth). |

All authenticated routes expect `Authorization: Bearer <access_token>` (Supabase JWT).

---

## Testing

- **Backend:** `pytest tests/ -v` (see `pyproject.toml` and `tests/`).
- **Frontend:** `cd apps/frontend && npm run test` (Vitest).

---

## License

MIT.

---

## Learn more

See demo and full case study: [pedrorodas.com/#projects](https://pedrorodas.com/#projects)

---

## Disclaimer

Nutrition estimates from photos are approximate. The system is designed for behavioral guidance, not clinical precision.
