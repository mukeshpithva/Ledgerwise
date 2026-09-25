# Ledgerwise bookkeeping application

Ledgerwise is a browser-based Canadian bookkeeping workspace built with React and Vite.

## Run locally

From this folder:

```bash
npm install
npm start
```

Open the URL shown by Vite, normally `http://localhost:5173/`.

The frontend works without a separate API server. Demo authentication and bookkeeping records are stored in the browser's `localStorage`, so data remains after refresh on the same browser.

## Demo access

- Email: `demo@example.com`
- Password: `demo`

## Included workflows

- Dashboard with live income, expense, receivables, and compliance totals
- Transaction create, edit, delete, search, categorization, account, status, notes, and amount fields
- Invoice create, edit, delete, client, due date, status, and amount fields
- Compliance checklist with editable due dates, statuses, and notes
- Reports with income statement, invoice summary, period selection, and CSV export
- AI bookkeeping agent with explainable local categorization suggestions, GST/HST calculations, compliance monitoring, receipt/invoice text extraction, state snapshots, deterministic tool orchestration, streamed progress, and approval-gated transaction posting
- Settings for business profile, currency, fiscal year, save state, and demo data reset
- Responsive layout for desktop and mobile screens

## AI assistant

Open **AI Agent** from the sidebar. The current implementation runs locally in the browser and does not send financial data to a third-party AI provider. It provides deterministic assistance for:

- Categorizing transactions from descriptions
- Estimating GST/HST output tax and input tax credits
- Flagging pending transactions, overdue invoices, and incomplete compliance tasks
- Extracting document type, amount, date, and invoice reference from pasted receipt/invoice text

These suggestions are review aids and do not replace a CPA, tax professional, or official CRA filing calculation.

The agent console can accept a receipt description such as `Adobe invoice INV-1042 dated 2026-09-23 total 125.00`. It reads the current local books, runs document analysis, categorization, GST/HST, and compliance tools in sequence, explains each step, then prepares a reviewable transaction. Nothing is posted until the user selects **Approve & post transaction**.

## Production scale boundary

This repository is currently a frontend-first local prototype: demo records are persisted in browser `localStorage`, and the deterministic agent runs in the browser. Supporting 100,000+ accounts in production requires a multi-tenant backend with durable database storage, tenant isolation, indexed ledger tables, queued agent jobs, streaming transport (SSE or WebSockets), object storage for documents, authentication/authorization, audit logs, rate limits, observability, and CRA-rule versioning. The current agent/tool boundaries are designed so those services can replace the local implementations without changing the review-and-approval UX.

### Agent API foundation

The repository now includes a PostgreSQL-ready Express service for persisted agent runs:

```bash
set DATABASE_URL=postgres://user:password@localhost:5432/ledgerwise
psql "%DATABASE_URL%" -f server/schema.sql
npm run server
```

The service exposes:

- `POST /api/agent-runs` to create a tenant-scoped run
- `GET /api/agent-runs/:id` to resume a run after refresh
- `GET /api/agent-runs/:id/events` for server-sent progress events
- `POST /api/agent-runs/:id/approve` for approval state transitions

The frontend attempts the persisted SSE workflow first and falls back to the existing local deterministic runner when the backend is unavailable. The approval endpoint records the decision; immutable ledger posting remains the next milestone.

## Validation

```bash
npm run build
npm run lint
```

Lint may report the existing Fast Refresh context-export advisory; it does not block the build.
