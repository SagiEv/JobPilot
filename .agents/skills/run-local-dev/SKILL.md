---
name: run-local-dev
description: >-
  Use this skill to run the node backend, python AI service, and frontend locally and open the browser to check the current feature being worked on.
---

# Run Local Development Environment

Follow these steps to run the node backend, python AI service, and frontend locally and check the application.

## Steps

1. **Start the Backend:**
   Use the `run_command` tool to start the backend server as a daemon.
   - **Command:** `npm run dev`
   - **Cwd:** `<workspace_root>\backend`
   - **IsDaemon:** `true`
   - **WaitMsBeforeAsync:** `2000` (to ensure it starts successfully and you can see any initial errors)

2. **Start the AI Microservice:**
   Use the `run_command` tool to start the Python FastAPI server as a daemon.
   - **Command:** `python main.py`
   - **Cwd:** `<workspace_root>\backend\ai_service`
   - **IsDaemon:** `true`
   - **WaitMsBeforeAsync:** `2000`

3. **Start the Frontend:**
   Use the `run_command` tool to start the frontend development server as a daemon.
   - **Command:** `npm run dev`
   - **Cwd:** `<workspace_root>\frontend`
   - **IsDaemon:** `true`
   - **WaitMsBeforeAsync:** `2000`

   *(Note: The frontend Vite config has `server.open: true`, which should automatically open a browser window for the user.)*

4. **Check the Application:**
   - **If the user wants YOU (the agent) to verify the feature:** Use the `browser_subagent` tool to navigate to `http://localhost:3000` and perform the requested checks. Provide a descriptive `Task` and `RecordingName` (e.g., `feature_verification`).
   - **If the user wants to check it themselves:** Inform them that the backend services and frontend are running, and the browser should have opened automatically to `http://localhost:3000`. If they report the browser didn't open, you can run the command `Start-Process "http://localhost:3000"` (Windows) using the `run_command` tool to explicitly open it for them.

## Cleanup

If the user asks to stop the local environment later, use the `manage_task` tool with action `list` to find the task IDs, and then `kill` to terminate all the background tasks (Node backend, AI service, and frontend).
