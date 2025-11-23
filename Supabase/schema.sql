-- Create the scores table
CREATE TABLE scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  player_name text NOT NULL,
  score bigint NOT NULL,
  mode text NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read scores
CREATE POLICY "Enable read access for all users" ON scores
  FOR SELECT
  USING (true);

-- Create policy to allow everyone to insert scores (anon insert)
CREATE POLICY "Enable insert access for all users" ON scores
  FOR INSERT
  WITH CHECK (true);

-- Optional: Create an index on score for faster leaderboard queries
CREATE INDEX scores_score_idx ON scores (score DESC);
CREATE INDEX scores_mode_idx ON scores (mode);
