-- Podcast messages: users post messages to the city
CREATE TABLE IF NOT EXISTS podcast_messages (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast cleanup of old messages and ordering
CREATE INDEX IF NOT EXISTS idx_podcast_created_at ON podcast_messages (created_at DESC);
