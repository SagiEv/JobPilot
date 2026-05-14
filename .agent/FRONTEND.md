### Component Patterns
**Architecture:** Functional components, React Hooks (`/src/hooks`).
**State Management:** React Context API + Local State. Supabase Client for backend data.
**Data Fetching:** Axios instance (`/src/api.js`) for Node.js API interactions.
**Styling:** Modern CSS (Utility classes / CSS Modules) compatible with Vite.
**Folder Structure:** `/src/components` (Reusable UI), `/src/pages` (Application views), `/src/hooks` (Custom logic), `api.js` (Frontend API client).

### Build & Deployment
**Build Directory:** `dist` (generated via Vite).
**Environment Variables:** Prefix frontend vars with `VITE_` (e.g., `VITE_API_URL`, `VITE_SUPABASE_URL`).
**Deployment:** Any static host supporting SPA routing (rewrite all routes to `/index.html`).

### Interaction Rules
**Auth State:** Managed via Supabase Auth.
**API Calls:** Centralized Axios instance (`api.js`) pointing to the Node.js backend.
**Rich Text:** React Quill used for rich text editing (e.g., CV sections).
