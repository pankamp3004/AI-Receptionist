python main_saas.py dev

cd frontend; npm run dev

cd backend; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

cd voice-frontend; npm run dev





# 🤖 AI Receptionist — Multi-Tenant SaaS Voice Agent

An AI-powered voice receptionist system built on **LiveKit**, **OpenAI**, **Deepgram**, and **Cartesia**. It handles inbound calls, routes callers to the right department, books appointments, and tracks costs — all per-tenant (multi-org).

---

## 📐 Project Architecture

```
AI-Receptionist/
├── main_saas.py          # 🎙️ LiveKit voice agent entry point (multi-tenant)
├── agents/               # Agent logic (hospital, hotel, salon, multi-tenant)
├── tools/                # Shared tools (RAG client, session logger, cost tracker, email/OTP)
├── memory/               # Caller memory & multi-tenant DB service
├── prompts/              # Prompt templates
├── config/               # Environment validation & config loader
├── database/             # PostgreSQL connection pool
├── backend/              # FastAPI REST API (admin dashboard backend)
│   ├── app/
│   │   ├── main.py       # FastAPI app entry point
│   │   ├── api/v1/       # REST routes (call_logs, knowledge, call_cost, etc.)
│   │   ├── crud/         # Database CRUD operations
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic services
│   ├── alembic/          # Database migrations
│   └── requirements.txt  # Python dependencies
├── frontend/             # 🖥️ Admin Dashboard (Next.js 14)
└── voice-frontend/       # 🎧 Voice call UI (Next.js 15 + LiveKit React)
```

---

## ✅ Prerequisites

Before running the project, make sure you have:

| Requirement | Version |
|---|---|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 14+ (or Neon/Supabase cloud) |

You also need accounts and API keys for:
- [LiveKit Cloud](https://cloud.livekit.io/) — real-time voice infrastructure
- [OpenAI](https://platform.openai.com/) — LLM (GPT-4o-mini)
- [Deepgram](https://console.deepgram.com/) — Speech-to-Text
- [Cartesia](https://cartesia.ai/) — Text-to-Speech

---

## ⚙️ Environment Setup

### 1. Root `.env` (Voice Agent)

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# LiveKit
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here

# AI Services
OPENAI_API_KEY=sk-your_openai_key_here
DEEPGRAM_API_KEY=your_deepgram_key_here
CARTESIA_API_KEY=your_cartesia_key_here

# Agent Config
AGENT_TYPE=hospital
LOG_LEVEL=INFO
ENVIRONMENT=development
TIMEZONE=Asia/Kolkata

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=AI Receptionist <your-email@gmail.com>
COMPANY_NAME=City Health Clinic
```

### 2. Backend `.env` (`backend/.env`)

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with the same `DATABASE_URL` and any additional backend config.

### 3. Voice Frontend `.env.local` (`voice-frontend/.env.local`)

```bash
cp voice-frontend/.env.example voice-frontend/.env.local
```

Edit with your LiveKit credentials:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
```

### 4. Admin Frontend `.env.local` (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🐍 Python Setup (Voice Agent + Backend)

### Install Python dependencies

It is recommended to use a virtual environment:

```bash
# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install root-level agent dependencies
pip install livekit livekit-agents livekit-plugins-openai livekit-plugins-deepgram livekit-plugins-cartesia livekit-plugins-silero openai python-dotenv asyncpg aiohttp

# Install backend dependencies
pip install -r backend/requirements.txt
```

---

## 🗄️ Database Setup (Migrations)

Run Alembic migrations to set up the database schema:

```bash
cd backend
alembic upgrade head
cd ..
```

> **Note:** Make sure `DATABASE_URL` is set correctly in `backend/.env` before running migrations.

---

## 🚀 Running the Project

The project has **4 services** that need to run simultaneously. Open separate terminals for each.

---

### Service 1 — 🎙️ Voice Agent (LiveKit Worker)

```bash
# From the project root
python main_saas.py start
```

This starts the LiveKit voice worker that handles inbound calls and routes them to the AI agent.

**Options:**
```bash
# Run in development mode with auto-reload
python main_saas.py dev

# Connect to a specific LiveKit room for testing
python main_saas.py connect --room <room-name>
```

---

### Service 2 — 🔧 Backend API (FastAPI)

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- **Base URL:** `http://localhost:8000`
- **Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **Health Check:** `http://localhost:8000/health`

---

### Service 3 — 🖥️ Admin Dashboard (Frontend)

```bash
cd frontend
npm install       # First time only
npm run dev
```

The admin dashboard will be available at: **`http://localhost:3000`**

> This is the management UI for viewing call logs, managing knowledge bases, tracking costs, and configuring organizations.

---

### Service 4 — 🎧 Voice Call UI (Voice Frontend)

```bash
cd voice-frontend
npm install       # First time only
npm run dev
```

The voice call interface will be available at: **`http://localhost:3001`** (or the default Next.js port shown in the terminal)

> This is the web-based voice interface for callers to connect via their browser using LiveKit.

---

## 🗂️ Quick Reference

| Service | Command | URL |
|---|---|---|
| 🎙️ Voice Agent | `python main_saas.py start` | LiveKit Cloud |
| 🔧 Backend API | `uvicorn app.main:app --reload` (in `backend/`) | `http://localhost:8000` |
| 🖥️ Admin Dashboard | `npm run dev` (in `frontend/`) | `http://localhost:3000` |
| 🎧 Voice Call UI | `npm run dev` (in `voice-frontend/`) | `http://localhost:3001` |

---

## 🤖 Supported Agent Types

Set `AGENT_TYPE` in your `.env` to choose the agent persona:

| Value | Description |
|---|---|
| `hospital` | Multi-tenant hospital receptionist (default) |
| `hotel` | Hotel concierge / booking agent |
| `salon` | Salon appointment booking agent |

---

## 🛠️ Project Tools & Services

| Module | Purpose |
|---|---|
| `tools/rag_client.py` | Retrieval-Augmented Generation (knowledge base search) |
| `tools/session_logger.py` | Universal call session logger |
| `tools/cost_tracker.py` | Per-call LLM & TTS cost tracking |
| `tools/email_service.py` | Email notifications & confirmations |
| `tools/otp_service.py` | OTP generation & verification |
| `memory/multitenant_service.py` | Multi-tenant DB interactions (orgs, call logs, config) |
| `config/env_validator.py` | Startup configuration validation |
| `database/connection.py` | PostgreSQL async connection pool |

---

## 📋 Useful Commands

```bash
# Check database connectivity
cd backend && python check_db.py

# Run database migrations
cd backend && alembic upgrade head

# Create a new migration
cd backend && alembic revision --autogenerate -m "description"

# View environment configuration docs
cat config/environments.md
```

---

## 🔒 Security Notes

- **Never commit `.env` files** to version control — they are in `.gitignore`
- Use `wss://` (not `ws://`) for LiveKit in production
- Use app-specific passwords for Gmail SMTP
- Rotate API keys regularly
- Always use `sslmode=require` for PostgreSQL connections

---

## 📁 Logs

Call session logs are stored in the `logs/` directory at the project root. Each call creates a log file for debugging.
