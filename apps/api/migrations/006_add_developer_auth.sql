-- Migration: Add developer authentication fields
-- Supports email/password auth for developer portal

-- Add password fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(255);

-- Make google_id optional (was required before)
ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL;

-- Add environment column to api_keys
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'sandbox';
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS request_count INTEGER DEFAULT 0;

-- Create index for email lookups (for login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index for api_keys by user
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
