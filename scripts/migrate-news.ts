import { neon } from "@neondatabase/serverless";

async function migrate() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS news_feed_items (
      id VARCHAR(64) PRIMARY KEY,
      source VARCHAR(32) NOT NULL DEFAULT 'kaktus',
      source_url TEXT NOT NULL,
      headline TEXT NOT NULL,
      headline_ru TEXT NOT NULL,
      line1 TEXT NOT NULL,
      line1_ru TEXT NOT NULL,
      line2 TEXT NOT NULL,
      line2_ru TEXT NOT NULL,
      topic_suggestion TEXT NOT NULL,
      topic_suggestion_ru TEXT NOT NULL,
      mode_suggestion VARCHAR(32) NOT NULL DEFAULT 'chill',
      published_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  console.log("news_feed_items table created");

  await sql`CREATE INDEX IF NOT EXISTS idx_news_feed_created ON news_feed_items (created_at DESC)`;
  console.log("index created");

  // Track when the last ingest ran
  await sql`
    CREATE TABLE IF NOT EXISTS news_ingest_log (
      id SERIAL PRIMARY KEY,
      ran_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      items_count INTEGER DEFAULT 0
    )
  `;
  console.log("news_ingest_log table created");
}

migrate().catch(console.error);
