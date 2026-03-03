# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
make setup          # First-time: install Python + frontend deps, copy .env.example → .env
make dev            # Start full stack via Docker Compose (backend + frontend)
make backend        # Run FastAPI backend locally without Docker (port 8000)
make frontend       # Run Vite frontend locally without Docker (port 8080)
make test           # Run Python tests
make test-file FILE=tests/test_vision_agent.py  # Run a single test file
make lint           # Lint + format Python (ruff)
make lint-frontend  # TypeScript type-check
```

Backend: `uvicorn apps.mcp_server.main:app --reload --port 8000`
Frontend: `cd apps/frontend && npm run dev`

## Architecture

**Stack:** Python/FastAPI backend · LangGraph orchestration · SQLite + SQLAlchemy · React/Vite frontend (port 8080) · Anthropic Claude API

**Models:**
- Vision: `claude-sonnet-4-6` (meal photo analysis)
- Text/coaching/chat/nutrition: `claude-haiku-4-5-20251001`

**Key data flow:**
1. Frontend `POST /meals` (photo) → FastAPI → LangGraph DAG
2. DAG: `vision_node` (Claude Sonnet — identifies foods + gram weights) → `nutrition_node` (Claude Haiku — estimates macros/micros) → `update_context_node` (SQLite) → conditional `coaching_node` (Claude Haiku — nudge)
3. Frontend polls `GET /daily-summary` for macro/micro/MPS data
4. `POST /chat` injects today's `DailyLog` as context into Claude Haiku

**Package layout:**
- `apps/mcp_server/` — FastAPI app, routes, Pydantic schemas, SQLAlchemy models
- `apps/agents/` — `vision_agent.py`, `nutrition_agent.py`, `mps_agent.py`
- `workflows/` — `state.py` (MealFlowState TypedDict), `graphs/meal_flow.py` (DAG)
- `apps/frontend/` — React/Vite PWA (Tailwind, shadcn/ui, glassmorphism: light mode, red pastel `#E07070` + black)

**Session model:** UUID stored in browser `localStorage`, sent as `X-Session-ID` header on every API call. No login required.

**MPS scoring:** A meal with ≥ `PROTEIN_SPIKE_THRESHOLD_G` (default 30g) protein counts as a spike. Score = `achieved / 4` daily target.

## Environment Variables

Copy `.env.example` to `.env` and fill in:
- `ANTHROPIC_API_KEY` — your Anthropic API key (vision + nutrition + coaching + chat all use Claude)

---

# Product Requirements Document (PRD)
## Project: AI Dietary Coach for Gym Goers (MVP)
## Version: 0.1
## Owner: Pedro Rodas
## Status: MVP Definition – Build-Ready
## Target Year: 2026

---

## 1. Product Vision

Build a **low-friction, AI-native dietary coach for gym goers** that allows users to:
- Log meals via photos
- Track macros and critical micronutrients automatically
- Receive intelligent, evidence-based nudges to optimize **Muscle Protein Synthesis (MPS)** via meal timing

The product prioritizes **automation, accuracy, and adherence**, not exhaustive nutrition tracking.

---

## 2. Target User

**Primary User**
- Gym-goers / strength trainees
- Bulking, cutting, or maintaining
- Wants results with minimal “food admin”

**User Mindset**
- Protein-first
- Performance-oriented
- Time-constrained
- Will not manually log food long-term

---

## 3. MVP Scope (FINAL – NON-NEGOTIABLE)

### Feature 1: Photo-Based Macro & Micro Calculator
**Goal:** Zero-friction nutrition logging

#### Functional Requirements
- User uploads a meal photo
- System identifies foods and estimates portions
- System computes:
  - Calories
  - Protein
  - Carbohydrates
  - Fats
  - **Micronutrients (MVP only):**
    - Fiber
    - Sodium
    - Potassium
- Results are aggregated into daily totals

#### Non-Goals (Explicitly Out of Scope)
- Manual food entry
- Full micronutrient panels
- Recipe creation
- Grocery lists

---

### Feature 2: Protein Distribution & MPS Tracking
**Goal:** Optimize muscle protein synthesis across the day

#### Core Concept
- Muscle Protein Synthesis is maximized with **3–4 evenly spaced protein feedings**
- Total protein alone is insufficient

#### Functional Requirements
- Detect protein “spikes” (≥ ~25–40g protein per meal)
- Track timestamps of protein intake
- Compute daily MPS score:
  - Example: `2 / 4 protein spikes achieved`
- Visualize protein timing across the day

---

### Feature 3: Intelligent Motivational & Coaching Agent
**Goal:** Increase adherence via high-signal nudges

#### Functional Requirements
- Generate short, actionable nudges based on:
  - Missed protein spikes
  - Low fiber
  - Low sodium/potassium relative to training
- Coaching tone:
  - Evidence-based
  - Gym-oriented
  - No generic motivational quotes

#### Examples
- “You’ve only hit 2 protein spikes today. One more 30–40g serving before bed would improve overnight recovery.”
- “Low sodium today + training soon = flat session risk. Salt your next meal.”

---

## 4. Architecture Overview

### High-Level Architecture
[PWA Frontend]
|
v
[MCP Server / API Gateway]
|
v
[LangGraph Orchestration Layer]
|
+--> Vision Agent (Qwen / YOLO)
|
+--> Nutrition Agent (Macros & Micros)
|
+--> MPS & Motivation Agent
|
v
[Context Store]

---

## 5. Why Agents + MCP + LangGraph

### Agents
- Encapsulate **capabilities**, not endpoints
- Each agent owns:
  - Reasoning
  - Tool usage
  - Domain logic
- Enables future expansion without workflow rewrites

### MCP (Model Context Protocol)
- Centralized, long-lived user state
- Event-driven orchestration
- Model-agnostic routing
- Single API surface for frontend

### LangGraph
- Explicit DAG-based workflows
- Shared state passed between agents
- Conditional routing (e.g. when to nudge)
- Easy insertion/removal of agent nodes

---

## 6. Models & Tooling

### Vision Model
**MVP Choice**
- Qwen3-Omni-30B-A3B-Instruct

**Future Upgrade**
- YOLOv8 (food-trained) for segmentation
- Hybrid YOLO → LLM semantic reasoning

### Text & Reasoning Model
- gpt-oss-20B (local)
- Used for:
  - Coaching
  - MPS logic
  - Macro reasoning
  - Chat interface

### Nutrition Data
- Verified nutrition database (USDA / lab-verified source)
- No crowd-sourced nutrition values

---

## 7. LangGraph Workflow (Explicit DAG)

### Meal Logging Flow
START
↓
Meal Photo Uploaded
↓
Vision Agent
↓
Nutrition Agent
↓
Update Daily Context
↓
IF protein_spike_detected OR deficiency_detected
→ Motivation Agent
ELSE
→ END

---

## 8. MCP Responsibilities

### Context Store (Example Schema)
```json
{
  "user_id": "uuid",
  "goal": "bulk | cut | maintain",
  "protein_target_g": 165,
  "calorie_target": 2800,
  "meals_today": [],
  "protein_spikes": ["09:30", "14:10"],
  "micros_today": {
    "fiber_g": 18,
    "sodium_mg": 2100,
    "potassium_mg": 2400
  }
}
```

Event Types

- meal_logged
- macros_computed
- protein_spike_detected
- micronutrient_deficiency_detected
- nudge_generated

## 9. API Design (MCP Server)

### Public API (Frontend-facing)

- POST /meals
   - Upload meal photo
- GET /daily-summary
- GET /weekly-summary
- POST /chat
   - Reason over meals, macros, micros, progress

### Internal Agent APIs

- POST /agents/vision
- POST /agents/nutrition
- POST /agents/mps_coach

## 10. Chat Interface (MVP-Ready)

### Capabilities

- Ask about:
   - “How am I doing today?”
   - “Did I hit my protein?”
   - “What should I eat next?”

- Chat responses must:
   - Use MCP context
   - Be grounded in logged data
   - Avoid hallucinated nutrition advice

## 11. Frontend (Phase 1: Readiness)
### Type
- Progressive Web App (PWA)

### MVP UI Screens
- Meal photo upload
- Daily macro & micro summary
- Protein timing timeline
- Chat interface

### Note

I like modern **glassmorph style, light mode and (red pastel color with black)**

## 12. Project Structure (Backend)
``` code
dietary-coach/
├── apps/
│   ├── mcp-server/
│   │   ├── main.py
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── context/
│   │   └── events/
│   ├── agents/
│   │   ├── vision_agent/
│   │   ├── nutrition_agent/
│   │   └── mps_agent/
├── langgraph/
│   ├── graphs/
│   └── state.py
├── models/
│   ├── qwen/
│   └── gpt_oss/
├── data/
│   └── nutrition_db/
├── infra/
│   ├── docker/
│   └── deployment/
├── tests/
└── README.md
```

## 13. Success Criteria (MVP)

- User can log meals without manual entry
- Protein totals within reasonable estimation bounds
- System identifies <3 protein spikes accurately
- Coaching nudges are timely and relevant
- End-to-end flow works via API + chat

## 14. Explicit Non-Goals (MVP)

- Medical advice
- Meal plans
- Grocery automation
- Wearables integration
- Full micronutrient tracking
- Social features

## 15. MVP Philosophy

**High signal > high completeness**

This MVP proves:

- Agent-based reasoning
- Context-driven AI workflows
- Real value for gym-goers
- Clean foundations for future expansion

