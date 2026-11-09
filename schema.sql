CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  mime TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_user_q ON notes(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);

INSERT OR IGNORE INTO users (id, name, color, created_at) VALUES
  ('u1', '杨玉秀', '#A67C10', 0),
  ('u2', '李泽枫', '#174A77', 0);

CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_fav_user ON favorites(user_id);

CREATE TABLE IF NOT EXISTS daily_picks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  pick_date TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_picks_uniq ON daily_picks(user_id, question_id, pick_date);
CREATE INDEX IF NOT EXISTS idx_picks_date ON daily_picks(user_id, pick_date);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id, parent_id);

CREATE TABLE IF NOT EXISTS folder_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  folder_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  text_content TEXT,
  mime TEXT,
  data TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_folder ON folder_items(user_id, folder_id);
