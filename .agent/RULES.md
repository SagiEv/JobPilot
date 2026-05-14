### Coding Standards
**Naming conventions:** `camelCase` (JS variables, functions), `PascalCase` (React Components), `snake_case` (Python variables, functions), `UPPER_SNAKE_CASE` (Constants).
**Error Handling:** Global try/catch blocks. Return standardized JSON errors (`{ "error": "Code", "message": "Details" }`).
**Linting/Formatting:** Maintain clean, readable code.

### AI Interaction Rules
**Constraint 1:** Do not scan directories unless explicitly requested. Rely on provided context.
**Constraint 2:** Provide atomic code snippets only. Do not output entire files unless modifying 80%+ of the file.
**Constraint 3:** Reference `SERVICE_MAP.md` before proposing architectural changes.
**Constraint 4:** Assume components exist if referenced in the structure. Ask for missing context rather than hallucinating implementation.
**Constraint 5:** Strict adherence to "No filler text". Output technical facts, code, and direct answers.
**Constraint 6:** For debugging, pinpoint the exact tier (React, Node, Python, Supabase) before writing fix code.
