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

-- Safety net: rolling snapshots of app_state. A trigger copies the PREVIOUS
-- blob into app_state_history before a write, at most once per 15 minutes, keeping
-- the latest 96 (about a day). Needs no Worker change. Already applied to the live DB.
-- Restore (example): UPDATE app_state SET data=(SELECT data FROM app_state_history WHERE id=N) WHERE id=1;
CREATE TABLE IF NOT EXISTS app_state_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL,
  saved_at TEXT NOT NULL,
  snapped_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TRIGGER IF NOT EXISTS app_state_snapshot BEFORE UPDATE OF data ON app_state
WHEN length(OLD.data) > 1000
 AND COALESCE((SELECT MAX(snapped_at) FROM app_state_history), '') < strftime('%Y-%m-%dT%H:%M:%fZ','now','-15 minutes')
BEGIN
  INSERT INTO app_state_history (data, saved_at) VALUES (OLD.data, OLD.updated_at);
  DELETE FROM app_state_history WHERE id NOT IN (SELECT id FROM app_state_history ORDER BY id DESC LIMIT 96);
END;
