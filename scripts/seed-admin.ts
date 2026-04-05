import { neon } from "@neondatabase/serverless";
import { hash } from "bcryptjs";

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);

  // Create admin_users table
  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  console.log("admin_users table created");

  // Seed default admin user
  const email = "admin@onlyfun.space";
  const password = "admin123"; // Change this after first login!
  const passwordHash = await hash(password, 12);

  await sql`
    INSERT INTO admin_users (email, password_hash, name)
    VALUES (${email}, ${passwordHash}, ${"Admin"})
    ON CONFLICT (email) DO NOTHING
  `;

  console.log(`Seeded admin user: ${email} / ${password}`);
  console.log("IMPORTANT: Change the default password after first login!");

  // Create blocked_users table (IP-based)
  await sql`
    CREATE TABLE IF NOT EXISTS blocked_users (
      id SERIAL PRIMARY KEY,
      ip VARCHAR(100) NOT NULL,
      name VARCHAR(100),
      reason VARCHAR(500),
      blocked_until TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_blocked_users_ip ON blocked_users (ip)`;
  console.log("blocked_users table created");

  // Create user_names table (IP → name lock)
  await sql`
    CREATE TABLE IF NOT EXISTS user_names (
      id SERIAL PRIMARY KEY,
      ip VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_names_ip ON user_names (ip)`;
  console.log("user_names table created");

  // Create app_settings table
  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  console.log("app_settings table created");
}

seed().catch(console.error);
