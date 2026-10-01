---
name: run-local-tests
description: >-
  Use this skill to run tests for the local environment, including frontend, backend, AI service, or end-to-end (e2e) tests.
---

# Run Local Tests

Use the `run_command` tool to execute the appropriate testing commands based on the user's request. Always ensure you run the command in the correct working directory (`Cwd`).

## 1. Frontend Tests

Set **Cwd** to `<workspace_root>\frontend`.

- **Unit/Component Tests:** `npm run test`
- **End-to-End (E2E) Tests:** `npm run e2e` (Uses Playwright)
- **Coverage Report:** `npm run coverage`
- **UI Mode for Tests:** `npm run test:ui`

## 2. Node Backend Tests

Set **Cwd** to `<workspace_root>\backend`.

- **All Tests:** `npm run test`
- **Unit Tests:** `npm run test:unit`
- **Integration Tests:** `npm run test:integration`
- **Integration (Live AI):** `npm run test:integration:live`
- **Coverage Report:** `npm run test:coverage`

## 3. AI Service Tests

Set **Cwd** to `<workspace_root>\backend\ai_service`.

- **All Tests:** `pytest`
- **Security Tests:** `pytest -m security`
- **Schema Tests:** `pytest -m schema`
- **Integration Tests:** `pytest -m integration`

## 4. Run All Tests

If the user asks to "run all tests" across the entire project, execute the core test suites sequentially. Run them synchronously (do not set `IsDaemon=true`) so you can capture the output and report the results to the user.

1. `<workspace_root>\frontend` -> `npm run test`
2. `<workspace_root>\backend` -> `npm run test`
3. `<workspace_root>\backend\ai_service` -> `pytest`

### Important Notes:
- **E2E Tests:** `npm run e2e` in the frontend might require the frontend and backend servers to be running locally first. If the user wants to run E2E tests, you might need to use the `run-local-dev` skill to start the servers before executing the E2E tests.
- **Reporting:** After running tests, summarize the results for the user (e.g., how many passed/failed) and provide the relevant logs if there are failures.
