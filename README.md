# Sathi - MVP

Sathi is a voice-first, multilingual post-hospital recovery companion designed to bridge the gap between hospital discharge and the next clinical interaction.

> **Disclaimer:** Sathi is a prototype recovery-support system and does not diagnose, prescribe, or replace professional medical care.

## Architecture
- **Frontend:** React + Vite + TypeScript (Tailwind CSS Design System)
- **Backend:** FastAPI + Python
- **Database:** SQLite

## Setup Instructions

### Backend
1. Copy `.env.example` to `.env`
2. `cd backend`
3. Install requirements: `pip install -r requirements.txt`
4. Seed demo data: `python demo_data.py`
5. Run server: `uvicorn app.main:app --reload` (from `backend/` with `PYTHONPATH=.`)

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev` (API at `http://localhost:8000/api` via `VITE_API_URL`)

## Demo logins (password: `demo1234`)
- `meena@sathi.demo` — patient
- `priya@sathi.demo` — caregiver
- `arjun@sathi.demo` — family
- Patient link code: `DB-DEMO01` · Judge demo: `#/demo`

## Demo Flow
1. Log in as Meena. Home shows adherence ring, doses, voice button.
2. Tap "Take" on a medicine — timeline + stats update.
3. Report a symptom by voice/text — deterministic safety triage (NORMAL/MONITOR/ESCALATE).
4. Chat 🤖 for the AI companion (context-aware, MOCK provider) or 👥 for live SSE care-team chat.
5. Log in as Priya to see the caregiver triage dashboard, link patients, send nudges.
6. Explore: scan stub, drug-check, jargon simplifier, journal, breathing, follow-ups, plans, settings.
