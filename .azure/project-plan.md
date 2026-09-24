# Project Plan

**Status**: Planning
**Created**: 2026-09-19
**Mode**: AUGMENT

---

## 1. Project Overview

**Goal**: Create a faithful, polished frontend-only mock of Comms Hub for logging communication quality issues, reviewing the submission history, and monitoring quality signals. The project is designed so that every module is independently testable.

**App Type**: Static + API

**API Login**: Yes

**Mode**: AUGMENT

**Deployment Plan**: No deployment plan found

---

## 2. Frontend — Web App

| Component | Technology |
|-----------|-----------|
| **Language** | JavaScript |
| **Framework** | React + Vite |
| **Package Manager** | npm |
| **Test Runner** | vitest |
| **Mocking Library** | vi.mock |
| **Test Command** | npm test |

---

## 3. Services Required

| Azure Service | Role in App | Environment Variable | Default Value (Local) | Classification |
|---------------|------------|---------------------|----------------------|----------------|
| Blob Storage | Store source email and screenshot attachments for later review | `STORAGE_CONNECTION_STRING` | `UseDevelopmentStorage=true` | Essential |

---

## 4. Prerequisites

### Run

| Tool | Service(s) | Installed | Version |
|------|------------|-----------|---------|
| Node.js | comms-hub-web | ❓ | Could not be confirmed by the current shell probe |
| npm | comms-hub-web | ❓ | Could not be confirmed by the current shell probe |

### Debug

| Tool | Service(s) | Installed | Version |
|------|------------|-----------|---------|
| Docker | comms-hub-web | ❓ | Could not be confirmed by the current shell probe |
| Docker Compose | comms-hub-web | ❓ | Could not be confirmed by the current shell probe |
| Edge | comms-hub-web | ✅ | 153.0.4234.46 |

Double-check all ❓ tools before proceeding; the current environment may expose version-manager installations differently in another shell.

---

## 5. Design System & UI

**Component Library**: Fluent UI v9
**Style Direction**: A light editorial operations workspace with generous breathing room, thin typographic hierarchy, quiet navy rules, sea-glass accents, and almost no visual chrome. Light mode is the default, with a visible theme button in the signed-in header that lets the user switch between Light, Dark, and System modes, persists the selection locally, and updates the interface immediately. Prioritize calm scanning and clear form hierarchy over dashboard density.
**Typography**: IBM Plex Sans for interface text and headings, using regular 400 and medium 500 weights

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#244B6B` | Active navigation, links, and primary save actions |
| `accent`  | `#71A9A1` | Review-complete states and quality highlights |
| `surface` | `#F7FAFB` | App canvas and page background |
| `text`    | `#24313B` | Headings, labels, and communication metadata |
| `muted`   | `#73808A` | Descriptions, helper text, dates, and secondary navigation |
| `border`  | `#DDE6EA` | Input outlines, dividers, table rules, and panel edges |

### Pages

| Page | Route | Purpose | Layout |
|------|-------|---------|--------|
| Log Entry | `/` | Capture a communication issue, review chain, timeline, notes, and source attachments | `header, nav, main, split(form|form), form, action-bar, footer` |
| Review History | `/history` | Scan recently logged communications by brand, error type, owner, and review status | `header, nav, main, tabs, table, card-list, actions, footer` |
| Quality Dashboard | `/dashboard` | Monitor communication quality volume, review throughput, and recurring error categories | `header, nav, main, hero, grid, card-list, table, footer` |
| Team Calendar | `/calendar` | Coordinate copywriting, review, and sign-off dates across the communications team | `header, nav, main, tabs, grid, card-list, actions, footer` |
| Templates | `/templates` | Browse reusable communication and review templates by content type | `header, nav, main, tabs, card-list, actions, footer` |
| My Stats | `/stats` | Show the signed-in manager's review throughput, accuracy, and workload trends | `header, nav, main, hero, grid, card-list, table, footer` |

### Sample Content

Log Entry — communication entry:
| Brand | Document type | Error type | Review chain | Final review |
|---|---|---|---|---|
| Royal Caribbean | Itinerary | Incorrect information | Jamie Rivera → Alex Morgan → Rami Nassralla | 2026-09-18 |
| Celebrity Cruises | Email | Typo or grammar | Morgan Lee → Taylor Brooks → Rami Nassralla | 2026-09-22 |
| Silversea | Web content | Brand compliance | Jordan Kim → Jamie Rivera → Rami Nassralla | 2026-09-25 |

Review History — communication record:
| Communication | Brand | Issue | Owner | Status |
|---|---|---|---|---|
| Caribbean sailing itinerary update | Royal Caribbean | Incorrect information | Jamie Rivera | Needs review |
| Captain's Club welcome email | Celebrity Cruises | Typo or grammar | Morgan Lee | Signed off |
| Silver Nova destination page | Silversea | Brand compliance | Jordan Kim | In review |

Quality Dashboard — quality signal:
| Metric | Value | Comparison |
|---|---|---|
| Entries this month | 42 | 12% above August |
| Average review time | 1.8 days | 0.4 days faster |
| Most common issue | Incorrect information | 14 entries |

Team Calendar — scheduled review:
| Date | Communication | Owner | Stage | Status |
|---|---|---|---|---|
| 2026-09-22 | Captain's Club welcome email | Morgan Lee | Final review | Scheduled |
| 2026-09-24 | Caribbean shore excursion guide | Alex Morgan | Manager sign-off | At risk |
| 2026-09-25 | Silver Nova destination page | Jordan Kim | Brand review | Scheduled |

Templates — reusable template:
| Template | Type | Required review | Last used |
|---|---|---|---|
| Itinerary change notice | Itinerary | Manager + brand | 2026-09-16 |
| Campaign launch email | Email | Copy + legal | 2026-09-12 |
| Destination page update | Web content | Brand + accessibility | 2026-09-10 |

My Stats — manager performance:
| Metric | Value | Trend |
|---|---|---|
| Entries reviewed | 28 | 8% above last month |
| Average sign-off time | 0.9 days | 0.2 days faster |
| Review accuracy | 96% | 3 points above target |

### State Coverage

- Log Entry shows the populated form plus a saved confirmation state.
- Review History includes an empty “Needs attachment” tab state and an inline retry/error banner for a failed history refresh.
- Quality Dashboard includes a loading skeleton state for the monthly trend panel.
- Team Calendar includes a scheduled and at-risk review state.
- Templates includes reusable communication records and a category tab strip.
- My Stats includes signed-in manager performance KPIs and a review trend panel.

---

## 6. Project Structure

```text
comms-hub/
├── .azure/
│   ├── project-plan.md
│   └── .preview-temp/
│       ├── theme.css
│       ├── manifest.json
│       ├── log-entry.html
│       ├── review-history.html
│       ├── quality-dashboard.html
│       ├── team-calendar.html
│       ├── templates.html
│       └── my-stats.html
├── index.html
├── package.json
└── src/
    ├── App.jsx
    ├── main.jsx
    └── styles.css
```

---

## 7. Route Definitions

| # | Method | Path | Description | Request Body | Response Body | Status Codes |
|---|--------|------|-------------|-------------|--------------|-------------|
| 1 | — | `/` | Client-side SPA entry point; navigation changes local view state only | — | Rendered React view | 200 |
| 2 | — | `/history` | Planned client-side review history view | — | Rendered React view | 200 |
| 3 | — | `/dashboard` | Planned client-side quality dashboard view | — | Rendered React view | 200 |
| 4 | — | `/calendar` | Planned client-side team calendar view | — | Rendered React view | 200 |
| 5 | — | `/templates` | Planned client-side templates view | — | Rendered React view | 200 |
| 6 | — | `/stats` | Planned client-side signed-in manager stats view | — | Rendered React view | 200 |

---

## 8. Next Steps

1. Run **azure-project-scaffold** to execute this plan
2. Run **azure-project-integrate** to wire the frontend to live data, smoke-test the backend, and create the migrations
3. Run **azure-debug-plan** → **azure-debug-generate** for Docker emulators and VS Code debugging
4. Run the **azure-deploy** agent when ready; it uses **azure-app-onboard** for architecture, cost estimation, IaC generation, provisioning, and health verification
