import { neon } from "@neondatabase/serverless";

async function migrate() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS events_feed_items (
      id VARCHAR(64) PRIMARY KEY,
      source VARCHAR(32) NOT NULL DEFAULT 'iticket',
      source_url TEXT NOT NULL,
      title TEXT NOT NULL,
      price TEXT,
      date_text TEXT,
      venue TEXT,
      category TEXT,
      topic_suggestion TEXT NOT NULL,
      topic_suggestion_ru TEXT NOT NULL,
      mode_suggestion VARCHAR(32) NOT NULL DEFAULT 'chill',
      visible BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  console.log("events_feed_items table created");

  await sql`CREATE INDEX IF NOT EXISTS idx_events_feed_created ON events_feed_items (created_at DESC)`;
  console.log("index created");

  // Add visible column to news_feed_items if it doesn't exist
  await sql`
    ALTER TABLE news_feed_items ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT TRUE
  `;
  console.log("added visible column to news_feed_items");
}

migrate().catch(console.error);
