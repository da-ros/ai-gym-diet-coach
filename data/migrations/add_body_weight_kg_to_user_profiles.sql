-- Add body_weight_kg to user_profiles (Supabase / PostgreSQL)
-- Run this in the Supabase SQL Editor or via migration tooling.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS body_weight_kg DOUBLE PRECISION DEFAULT 75.0;
