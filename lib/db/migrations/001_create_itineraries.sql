CREATE TABLE IF NOT EXISTS itineraries (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,
  input_snapshot JSONB,
  finish_reason TEXT,
  completion_tokens INTEGER,
  actual_days INTEGER,
  expected_days INTEGER,
  output_json JSONB,
  error_message TEXT
);
