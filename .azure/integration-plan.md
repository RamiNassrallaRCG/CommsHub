# Integration Plan

## Frontend
- Project folder: ./
- Build command: npm run build
- Dev command: npm run dev -- --host 0.0.0.0
- API seam: src/api/index.ts (swap mock client for live client)
- Mock files to remove: src/api/mockClient.ts, src/mocks/**, src/api/previewState.ts, src/api/previewStateSwitcher.tsx
- Live data wire-up: replace the exported client from the mock module in src/api/index.ts with the live implementation and keep all other app files unchanged
- Shared app state: kept local-only in the existing React app until integration

## Backend
- No backend service is required for this frontend-only plan.
- Health endpoint: n/a
- Run command: n/a
- Build command: n/a
- Port: n/a

## API routes
- No server routes are required; this app is client-side only.
- SPA routes: /
  - /history
  - /dashboard
  - /calendar
  - /templates
  - /stats

## Database
- Database: none
- Migration tool: none
- Migration directory: none
- Connection env vars: none
- Note: No seed data is to be created.

## Shared types
- Shared package: none
- Import alias: none

## Services
- Essential: none
- Enhancement: client-side state, attachment handling, navigation, and mock preview behaviors

## Validation checklist
- Confirm the app renders its main communication log experience in the browser
- Confirm the navigation states and save confirmation behavior work locally
- Keep the app structure ready for a future live-backend swap without rewriting component call sites

## Integration results

- Status: Integrated as a frontend-only application.
- Migrations: Not applicable. The project has no SQL/PostgreSQL database or migration tool.
- Backend smoke test: Not applicable. The project has no backend service, health endpoint, or server routes.
- Live data wiring: Not applicable. The scaffold contains no API seam, mock client, mock data directory, or preview-state switcher; form state, attachments, navigation, and save confirmation are intentionally local to `src/App.jsx`.
- End-to-end frontend/backend verification: Not applicable because no backend exists. The frontend build could not be executed in this environment because Node.js/npm is not installed or available on PATH.
- Seed data: None created.
