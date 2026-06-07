CREATE TABLE links (
  slug          TEXT PRIMARY KEY,
  url           TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER,
  max_clicks    INTEGER,
  click_count   INTEGER NOT NULL DEFAULT 0,
  last_clicked  INTEGER,
  disabled      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_links_created ON links(created_at DESC);
