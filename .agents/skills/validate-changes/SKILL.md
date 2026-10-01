---
name: validate-changes
description: Runs a comprehensive pre-commit validation suite including frontend/backend tests, lint checks, AI service tests, and E2E tests to ensure changes won't break the CI/CD pipeline on GitHub Actions.
version: 1.0.0
---

# Validate Changes Skill

Use this skill when the user asks to "validate changes", "run all checks", "make sure this won't break github actions", or "run validation".

## Instructions

This skill ensures that all layers of the application are fully tested and linted before the user commits or pushes their code. You must execute these checks sequentially.

1. **Check 1: Frontend Linting**
   - Run `npm run lint` in the `/frontend` directory using the `run_command` tool.
   - Wait for it to finish. Warnings are acceptable, but errors must be fixed.
2. **Check 2: Frontend Tests**
   - Run `npm run test -- --run` in the `/frontend` directory.
   - Ensure all tests pass.
3. **Check 3: Backend Tests**
   - Run `npm run test` in the `/backend` directory.
   - Ensure all tests pass.
4. **Check 4: AI Service Tests**
   - Run `pytest` (or the equivalent test command) in the `/ai-service` (or Python AI service) directory.
   - Ensure all tests pass.
5. **Check 5: E2E Tests (If applicable)**
   - If the project has an E2E testing suite (e.g., Playwright in `/frontend` via `npm run e2e`), run it.
   
## Handling Failures

- **Minor Failures:** If a linting error or a minor, obvious test failure occurs (e.g., a text mismatch in a React test because the UI text was updated), attempt to fix it automatically using your code editing tools (`replace_file_content`), then re-run the specific failing check.
- **Complex Failures:** If a backend test or complex logic test fails, halt the validation process. Create a short artifact or respond directly to the user explaining the exact failure, showing the logs, and providing a recommendation on how to fix it. Ask the user for permission to attempt the fix.

## Completion
If all checks pass successfully, inform the user that the codebase is fully validated and safe to push to GitHub Actions!
