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
