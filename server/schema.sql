CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'awaiting_approval', 'approved', 'rejected', 'completed', 'failed', 'cancelled')),
  snapshot JSONB NOT NULL,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_events (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, sequence)
);

CREATE INDEX IF NOT EXISTS agent_runs_tenant_updated_idx ON agent_runs (tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS agent_events_run_sequence_idx ON agent_events (run_id, sequence);
