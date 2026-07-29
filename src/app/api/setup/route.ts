import { NextResponse } from "next/server";
import { pool } from "@/db";

export async function GET() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL UNIQUE,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS edit_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        telegram_id BIGINT NOT NULL,
        original_file_name TEXT,
        edit_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS stats (
        id SERIAL PRIMARY KEY,
        total_edits INTEGER DEFAULT 0 NOT NULL,
        total_users INTEGER DEFAULT 0 NOT NULL,
        total_cuts INTEGER DEFAULT 0 NOT NULL,
        total_renames INTEGER DEFAULT 0 NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    return NextResponse.json({ success: true, message: "Tables created!" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
