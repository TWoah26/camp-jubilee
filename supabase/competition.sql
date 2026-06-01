-- Color Competition tables for Camp Jubilee
-- Run this migration in Supabase SQL editor or via CLI

CREATE TABLE competition_cabin_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  cabin_name text NOT NULL,
  color text NOT NULL CHECK (color IN ('blue', 'red', 'green', 'yellow')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, cabin_name)
);

CREATE TABLE competition_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('game_4way', 'game_2v2', 'cleanliness', 'manual')),
  category text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

CREATE TABLE competition_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES competition_events(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  color text NOT NULL CHECK (color IN ('blue', 'red', 'green', 'yellow')),
  cabin_name text,
  points numeric NOT NULL,
  note text
);

-- Indexes for common queries
CREATE INDEX competition_events_session_id_idx ON competition_events(session_id);
CREATE INDEX competition_scores_event_id_idx ON competition_scores(event_id);
CREATE INDEX competition_scores_session_id_idx ON competition_scores(session_id);
CREATE INDEX competition_cabin_colors_session_id_idx ON competition_cabin_colors(session_id);
