CREATE TABLE IF NOT EXISTS repositories (
  id SERIAL PRIMARY KEY,
  owner VARCHAR(255) NOT NULL,
  repo VARCHAR(255) NOT NULL,
  last_seen_tag VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner, repo)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  repository_id INTEGER NOT NULL REFERENCES repositories(id),
  confirmed BOOLEAN DEFAULT FALSE,
  confirm_token VARCHAR(255) NOT NULL,
  unsubscribe_token VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(email, repository_id)
);