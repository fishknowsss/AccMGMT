CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  concurrent_limit INTEGER NOT NULL DEFAULT 2,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  group_id TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO groups (id, name, sort_order) VALUES
  ('group-a', 'A组', 1),
  ('group-b', 'B组', 2),
  ('group-c', 'C组', 3),
  ('group-design', '设计组', 4);

INSERT OR IGNORE INTO users (id, name, email, group_id) VALUES
  ('user-wang', '小王', 'wang@studio.local', 'group-a'),
  ('user-lin', '小林', 'lin@studio.local', 'group-b'),
  ('user-chen', '陈也', 'chen@studio.local', 'group-c'),
  ('user-zhou', '周宁', 'zhou@studio.local', 'group-design');
