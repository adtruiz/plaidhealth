-- Migration: Add Connect Widget tables
-- Supports the embeddable Connect Widget (like Plaid Link)

-- Widget tokens: Short-lived tokens for initiating OAuth flow
CREATE TABLE IF NOT EXISTS widget_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(100) NOT NULL UNIQUE,
    client_user_id VARCHAR(255) NOT NULL,  -- Developer's user ID in their system
    redirect_uri VARCHAR(500),              -- Optional redirect after completion
    products TEXT[] DEFAULT ARRAY['health_records'],
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,                      -- Set when OAuth completes
    connection_id INTEGER REFERENCES ehr_connections(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Public tokens: Exchangeable tokens returned after successful OAuth
CREATE TABLE IF NOT EXISTS public_tokens (
    id SERIAL PRIMARY KEY,
    widget_token_id INTEGER NOT NULL REFERENCES widget_tokens(id) ON DELETE CASCADE,
    connection_id INTEGER NOT NULL REFERENCES ehr_connections(id) ON DELETE CASCADE,
    token VARCHAR(100) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    exchanged_at TIMESTAMP,                 -- Set when token is exchanged
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_widget_tokens_token ON widget_tokens(token);
CREATE INDEX IF NOT EXISTS idx_widget_tokens_user_id ON widget_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_widget_tokens_expires_at ON widget_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_public_tokens_token ON public_tokens(token);
CREATE INDEX IF NOT EXISTS idx_public_tokens_expires_at ON public_tokens(expires_at);
