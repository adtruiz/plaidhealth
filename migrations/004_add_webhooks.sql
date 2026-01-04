-- Migration: Add Webhooks system
-- This enables developers to receive real-time notifications about data changes

-- Create webhooks table (endpoint configurations)
CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(2048) NOT NULL,              -- Webhook delivery URL
  secret VARCHAR(64) NOT NULL,             -- Secret for signing payloads
  events TEXT[] NOT NULL DEFAULT ARRAY['*'], -- Events to subscribe to (* = all)
  description VARCHAR(255),                 -- User-friendly description
  enabled BOOLEAN DEFAULT true,            -- Whether webhook is active
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webhook_deliveries table (delivery log and retry tracking)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,        -- e.g., 'connection.created', 'data.synced'
  payload JSONB NOT NULL,                  -- The payload that was sent
  status VARCHAR(20) DEFAULT 'pending',    -- pending, delivered, failed
  http_status INTEGER,                     -- Response status code
  response_body TEXT,                      -- Response from the endpoint
  attempt_count INTEGER DEFAULT 0,         -- Number of delivery attempts
  next_retry_at TIMESTAMP WITH TIME ZONE,  -- When to retry next
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  last_attempt_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(user_id, enabled);

-- Indexes for deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(status, next_retry_at)
  WHERE status = 'pending' OR status = 'failed';

-- Comments
COMMENT ON TABLE webhooks IS 'Webhook endpoint configurations for real-time notifications';
COMMENT ON TABLE webhook_deliveries IS 'Log of webhook delivery attempts for debugging and retry';
COMMENT ON COLUMN webhooks.events IS 'Array of event types to subscribe to. Use ["*"] for all events.';
COMMENT ON COLUMN webhooks.secret IS 'HMAC-SHA256 secret for verifying webhook signatures';
