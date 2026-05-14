# Antigravity Project Context

## Initialization
Every time a new task starts, you MUST read the following files from the `/.agent/skills/` directory to maintain architecture consistency:
- `SERVICE_MAP.md` (Global Context)
- `BACKEND_NODE.md` (Oracle/Node logic)
- `SERVICE_PYTHON.md` (FastAPI/Logic)
- `FRONTEND.md` (Vercel/React patterns)

## Project Rules
- **Environment:** FE (Vercel), BE (Oracle Cloud), DB (Supabase).
- **Communication:** Follow the "Dense Mode" rules in `/.agent/RULES.md`.
- **Constraint:** Do not perform full recursive directory scans; rely on the `SERVICE_MAP.md`.