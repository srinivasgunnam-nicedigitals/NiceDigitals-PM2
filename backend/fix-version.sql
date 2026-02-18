-- Migration to populate version field for existing projects
-- This ensures all projects have version = 1 as the starting point

UPDATE "Project"
SET version = 1
WHERE version IS NULL;
