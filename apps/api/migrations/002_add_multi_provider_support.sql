-- Migration: Add multi-provider support
-- This migration updates the epic_connections table to support multiple EHR providers

-- Step 1: Add provider column to epic_connections table
ALTER TABLE epic_connections
ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'epic';

-- Step 2: Update existing records to have 'epic' as provider
UPDATE epic_connections
SET provider = 'epic'
WHERE provider IS NULL;

-- Step 3: Make provider column NOT NULL
ALTER TABLE epic_connections
ALTER COLUMN provider SET NOT NULL;

-- Step 4: Rename the table to ehr_connections (more generic)
ALTER TABLE epic_connections
RENAME TO ehr_connections;

-- Step 5: Update unique constraint to include provider
ALTER TABLE ehr_connections
DROP CONSTRAINT IF EXISTS epic_connections_user_id_patient_id_key;

ALTER TABLE ehr_connections
ADD CONSTRAINT ehr_connections_user_provider_patient_unique
UNIQUE (user_id, provider, patient_id);

-- Step 6: Create index on provider for faster queries
CREATE INDEX IF NOT EXISTS idx_ehr_connections_provider
ON ehr_connections(provider);

-- Step 7: Create index on user_id and provider combination
CREATE INDEX IF NOT EXISTS idx_ehr_connections_user_provider
ON ehr_connections(user_id, provider);

-- Note: Existing indexes on user_id will remain intact
