# Database Agent

Specialization: PostgreSQL database and data persistence

## Domain Knowledge
- PostgreSQL query optimization
- Connection pooling with pg
- Database migrations and schema design
- Data encryption patterns

## Primary Files
- `src/db.js` - Database module with all DB operations
- `src/db-setup.js` - Schema initialization
- `src/encryption.js` - Token encryption helpers
- `src/redis.js` - Redis caching layer

## Key Responsibilities
1. Manage user and connection data
2. Handle encrypted token storage
3. Implement audit logging
4. Manage session persistence

## Database Tables
- `users` - User accounts (Google OAuth)
- `ehr_connections` - Provider connections with encrypted tokens
- `api_keys` - B2B API keys (hashed)
- `webhooks` - Webhook configurations
- `webhook_deliveries` - Delivery history
- `audit_log` - Security audit trail
- `session` - Express sessions

## Testing Focus
- Test connection pooling under load
- Verify token encryption/decryption
- Test audit log completeness

## Common Tasks
- Add new database tables/columns
- Optimize slow queries
- Implement data retention policies
- Add database indexes
