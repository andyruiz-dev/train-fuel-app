-- Train & Fuel — D1 schema
-- Single-user app: one durable JSON blob holds the entire client state
-- (programs, exercise library, logs, measurements, settings). The client
-- keeps localStorage as an instant local cache, but this table is the
-- source of truth that survives cache clears, reinstalls, new devices.

CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Exercise library as real rows (not just JSON) so uploaded/imported
-- programs and AI generation can query "give me 3 alternates that hit
-- the same muscle group as exercise X" without parsing a blob.
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,      -- e.g. push, pull, legs, hinge, core, ruck
  equipment TEXT,                  -- e.g. rings, band, bodyweight, barbell
  cue TEXT,                        -- short coaching cue
  source TEXT NOT NULL,            -- 'builtin' | 'uploaded' | 'ai'
  locked INTEGER NOT NULL DEFAULT 1, -- 1 = hardcoded, only removed by explicit delete
  created_at TEXT NOT NULL
);

-- Saved programs (built-in, uploaded, or AI-generated), independent of
-- the JSON blob so they persist even if the blob format changes shape.
CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL,
  source TEXT NOT NULL,            -- 'builtin' | 'uploaded' | 'ai'
  structure TEXT NOT NULL,         -- JSON: weeks -> days -> slots (muscle group, not fixed exercise)
  locked INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
