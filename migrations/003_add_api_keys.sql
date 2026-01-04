-- Migration: Add API Keys table for B2B authentication
-- This enables developers to authenticate via API keys instead of session auth

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA256 hash of the actual key
  key_prefix VARCHAR(20) NOT NULL,        -- First 12 chars for display (e.g., "pfh_live_abc...")
  scopes TEXT[] DEFAULT ARRAY['read'],    -- Permissions: read, write, admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,    -- NULL means no expiration
  revoked_at TIMESTAMP WITH TIME ZONE,    -- NULL means active
  request_count INTEGER DEFAULT 0         -- Track API usage
);

-- Index for fast key validation (most common operation)
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- Index for listing user's keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- Index for finding active keys (exclude revoked)
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(user_id)
  WHERE revoked_at IS NULL;

-- Add comment for documentation
COMMENT ON TABLE api_keys IS 'API keys for B2B authentication. Keys are stored as SHA256 hashes.';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA256 hash of the API key. Original key is only shown once at creation.';
COMMENT ON COLUMN api_keys.key_prefix IS 'First ~12 characters of key for display purposes (e.g., pfh_live_abc...)';
COMMENT ON COLUMN api_keys.scopes IS 'Array of permissions: read (view data), write (modify data), admin (manage keys)';
