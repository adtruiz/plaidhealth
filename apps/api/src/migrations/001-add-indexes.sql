-- Migration 001: Add Performance Indexes
-- Run this migration to optimize common query patterns

-- ==================== EHR Connections ====================
-- Index for getting user's active connections (most common query)
CREATE INDEX IF NOT EXISTS idx_ehr_connections_user_active
ON ehr_connections (user_id, token_expires_at DESC)
WHERE token_expires_at > NOW();

-- Index for token refresh job (finds connections expiring soon)
CREATE INDEX IF NOT EXISTS idx_ehr_connections_refresh
ON ehr_connections (token_expires_at)
WHERE refresh_token IS NOT NULL;

-- Index for provider-specific queries
CREATE INDEX IF NOT EXISTS idx_ehr_connections_provider
ON ehr_connections (user_id, provider);

-- ==================== API Keys ====================
-- Index for API key validation (hashed key lookup)
CREATE INDEX IF NOT EXISTS idx_api_keys_hash
ON api_keys (key_hash)
WHERE revoked_at IS NULL;

-- Index for user's API keys listing
CREATE INDEX IF NOT EXISTS idx_api_keys_user
ON api_keys (user_id, created_at DESC);

-- ==================== Audit Logs ====================
-- Index for user activity queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
ON audit_logs (user_id, created_at DESC);

-- Index for action-based queries (e.g., security investigations)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
ON audit_logs (action, created_at DESC);

-- ==================== Webhooks ====================
-- Index for user's webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_user
ON webhooks (user_id)
WHERE enabled = true;

-- ==================== Webhook Deliveries ====================
-- Index for webhook delivery history
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook
ON webhook_deliveries (webhook_id, created_at DESC);

-- Index for failed deliveries (for retry logic)
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_failed
ON webhook_deliveries (webhook_id, created_at DESC)
WHERE status IN ('pending', 'failed');

-- ==================== Widget Tokens ====================
-- Index for widget token validation
CREATE INDEX IF NOT EXISTS idx_widget_tokens_token
ON widget_tokens (token)
WHERE used_at IS NULL AND expires_at > NOW();

-- Index for API user's widget tokens
CREATE INDEX IF NOT EXISTS idx_widget_tokens_user
ON widget_tokens (user_id, created_at DESC);

-- ==================== Public Tokens ====================
-- Index for public token exchange
CREATE INDEX IF NOT EXISTS idx_public_tokens_token
ON public_tokens (token)
WHERE exchanged_at IS NULL AND expires_at > NOW();

-- ==================== Statistics ====================
-- To verify indexes were created:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN
-- ('ehr_connections', 'api_keys', 'audit_logs', 'webhooks', 'webhook_deliveries', 'widget_tokens', 'public_tokens');
