import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '..', 'story-output')
const DB_PATH = path.join(DATA_DIR, 'hnovel.db')

let db: Database.Database

export function getDatabase(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export function initDatabase(): void {
  const d = getDatabase()

  d.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      genre TEXT NOT NULL DEFAULT 'school',
      sub_genre TEXT,
      setting_era TEXT,
      status TEXT DEFAULT 'planning',
      rating TEXT DEFAULT 'nsfw',
      nsfw_tags TEXT DEFAULT '[]',
      explicit_level TEXT DEFAULT 'moderate',
      target_audience TEXT DEFAULT 'male',
      pov TEXT DEFAULT 'third-person-limited',
      tense TEXT DEFAULT 'past',
      synopsis TEXT,
      tone_style TEXT,
      reference_style TEXT DEFAULT '',
      themes TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'supporting',
      status TEXT DEFAULT 'alive',
      gender TEXT,
      age TEXT,
      appearance TEXT,
      personality TEXT,
      background TEXT,
      sexual_orientation TEXT,
      preferences TEXT DEFAULT '[]',
      body_features TEXT,
      tags TEXT DEFAULT '[]',
      affection_level INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS character_relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      source_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      rel_type TEXT NOT NULL DEFAULT 'acquaintance',
      intimacy_level INTEGER DEFAULT 0,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      chapter_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      pov_character TEXT,
      location TEXT,
      status TEXT DEFAULT 'draft',
      word_count INTEGER DEFAULT 0,
      outline TEXT,
      content TEXT,
      scene_type TEXT DEFAULT 'normal',
      explicit_level TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(story_id, chapter_number)
    );

    CREATE TABLE IF NOT EXISTS continuity_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      state_key TEXT NOT NULL,
      state_value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_characters_story ON characters(story_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_story ON chapters(story_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_story ON character_relationships(story_id);
    CREATE INDEX IF NOT EXISTS idx_continuity_story ON continuity_state(story_id);
  `)

  // Migration: add reference_style to existing databases
  try { d.exec(`ALTER TABLE stories ADD COLUMN reference_style TEXT DEFAULT ''`) } catch {}
}
