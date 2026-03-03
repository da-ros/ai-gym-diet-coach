-- Add dish_name column to meals table (for existing databases)
-- Run this if you get errors about missing dish_name when logging meals.
-- PostgreSQL:
ALTER TABLE meals ADD COLUMN IF NOT EXISTS dish_name VARCHAR(128) NULL;
-- SQLite (use one or the other depending on your DB):
-- ALTER TABLE meals ADD COLUMN dish_name TEXT;
