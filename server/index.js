import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { analyzeDocument, calculateGst, categorizeTransaction, getComplianceFlags } from '../src/services/aiService.js';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 5000);
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DB_POOL_SIZE || 20) }) : null;
const subscribers = new Map();
app.use(cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

const identity = (request) => ({ tenantId: request.header('x-tenant-id') || 'demo-tenant', userId: request.header('x-user-id') || 'demo-user' });
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
function requireDatabase(response) {
  if (pool) return true;
  response.status(503).json({ error: 'Agent backend requires DATABASE_URL.' });
  return false;
}
async function saveEvent(runId, type, payload) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence FROM agent_events WHERE run_id = $1', [runId]);
    const sequence = Number(rows[0].sequence);
    await client.query('INSERT INTO agent_events (run_id, sequence, type, payload) VALUES ($1, $2, $3, $4)', [runId, sequence, type, payload]);
    const event = { type, sequence, ...payload };
    (subscribers.get(runId) || []).forEach((send) => send(event));
    return event;
  } finally {
    client.release();
  }
}
async function updateRun(runId, status, result = null, error = null) {
  await pool.query('UPDATE agent_runs SET status = $2, result = $3, error = $4, updated_at = NOW() WHERE id = $1', [runId, status, result, error]);
}
async function executeRun(run) {
  try {
    await updateRun(run.id, 'running');
    const snapshot = run.snapshot;
    await saveEvent(run.id, 'progress', { label: 'Reading current books', detail: `${snapshot.transactions?.length || 0} transactions and ${snapshot.invoices?.length || 0} invoices loaded.` });
    await delay(250);
    const document = analyzeDocument(run.prompt);
    const category = categorizeTransaction(run.prompt, 'expense');
    const tax = calculateGst({ amount: document.amount || 0, type: 'expense', rate: 0.05, included: false });
    const flags = getComplianceFlags(snapshot);
    await saveEvent(run.id, 'tool', { tool: 'analyze_document', label: 'Analyzing receipt or transaction context', detail: document.amount ? `Detected $${document.amount.toFixed(2)} and ${document.documentType.toLowerCase()} fields.` : 'No reliable total was found.' });
    await delay(250);
    await saveEvent(run.id, 'tool', { tool: 'categorize_transaction', label: 'Categorizing transaction', detail: `${category.category} suggested at ${Math.round(category.confidence * 100)}% confidence.` });
    await delay(250);
    await saveEvent(run.id, 'tool', { tool: 'calculate_gst_hst', label: 'Calculating GST/HST implication', detail: document.amount ? `Estimated 5% input tax credit: $${tax.tax.toFixed(2)}.` : 'Waiting for an amount.' });
    await delay(250);
    await saveEvent(run.id, 'tool', { tool: 'check_compliance', label: 'Checking CRA workflow signals', detail: flags[0].detail });
    const result = {
      document, category, tax, flags, canPost: Boolean(document.amount),
      proposedTransaction: {
        date: document.date || new Date().toISOString().slice(0, 10),
        description: run.prompt.slice(0, 120), category: category.category, type: 'expense',
        amount: document.amount || '', account: 'Business chequing', status: 'Pending',
        notes: `Prepared by Ledgerwise AI. ${category.reason}. Estimated GST/HST: $${tax.tax.toFixed(2)}.`,
      },
    };
    await updateRun(run.id, 'awaiting_approval', result);
    await saveEvent(run.id, 'complete', { label: 'Reviewable draft prepared', detail: 'The draft is ready for human approval.', result });
  } catch (error) {
    await updateRun(run.id, 'failed', null, error.message);
    await saveEvent(run.id, 'error', { label: 'Agent run failed', detail: error.message });
  }
}

app.get('/api/health', async (_request, response) => response.json({ status: 'ok', database: Boolean(pool) }));
app.post('/api/agent-runs', async (request, response) => {
  if (!requireDatabase(response)) return;
  const { prompt, snapshot } = request.body;
  if (!prompt || !snapshot) return response.status(400).json({ error: 'prompt and snapshot are required' });
  const { tenantId, userId } = identity(request);
  const id = randomUUID();
  await pool.query('INSERT INTO agent_runs (id, tenant_id, user_id, prompt, status, snapshot) VALUES ($1, $2, $3, $4, $5, $6)', [id, tenantId, userId, prompt, 'queued', snapshot]);
  executeRun({ id, prompt, snapshot });
  response.status(202).json({ id, status: 'queued' });
});
app.get('/api/agent-runs/:id', async (request, response) => {
  if (!requireDatabase(response)) return;
  const { tenantId } = identity(request);
  const { rows } = await pool.query('SELECT id, status, result, error, created_at, updated_at FROM agent_runs WHERE id = $1 AND tenant_id = $2', [request.params.id, tenantId]);
  if (!rows[0]) return response.status(404).json({ error: 'Agent run not found' });
  response.json(rows[0]);
});
app.get('/api/agent-runs/:id/events', async (request, response) => {
  if (!requireDatabase(response)) return;
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Connection', 'keep-alive');
  response.flushHeaders();
  const send = (event) => response.write(`data: ${JSON.stringify(event)}\n\n`);
  const { rows } = await pool.query('SELECT type, sequence, payload FROM agent_events WHERE run_id = $1 ORDER BY sequence', [request.params.id]);
  rows.forEach((event) => send({ type: event.type, sequence: event.sequence, ...event.payload }));
  const listeners = subscribers.get(request.params.id) || [];
  listeners.push(send);
  subscribers.set(request.params.id, listeners);
  request.on('close', () => subscribers.set(request.params.id, (subscribers.get(request.params.id) || []).filter((listener) => listener !== send)));
});
app.post('/api/agent-runs/:id/approve', async (request, response) => {
  if (!requireDatabase(response)) return;
  const { tenantId } = identity(request);
  const { rows } = await pool.query('UPDATE agent_runs SET status = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = $4 RETURNING id, status, result', [request.params.id, tenantId, 'approved', 'awaiting_approval']);
  if (!rows[0]) return response.status(409).json({ error: 'Run is not available for approval.' });
  await saveEvent(request.params.id, 'approved', { label: 'Agent run approved', detail: 'Approval recorded for downstream ledger posting.' });
  response.json(rows[0]);
});

app.listen(port, () => console.log(`Ledgerwise agent API listening on port ${port}`));
