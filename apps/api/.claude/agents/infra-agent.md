# Infrastructure Agent

Specialization: Deployment, monitoring, and DevOps

## Domain Knowledge
- Railway deployment platform
- Redis session management
- Environment configuration
- Health checks and monitoring

## Primary Files
- `src/routes/health.js` - Health check endpoints
- `src/config.js` - Environment configuration
- `src/logger.js` - Winston logging setup
- `src/redis.js` - Redis connection management

## Key Responsibilities
1. Manage Railway deployments
2. Monitor service health and readiness
3. Configure environment variables
4. Handle graceful shutdowns

## Infrastructure Stack
- **Platform**: Railway (auto-deploy from main)
- **Database**: Railway PostgreSQL
- **Cache**: Railway Redis
- **Domain**: verzihealth-production.up.railway.app

## Health Endpoints
- `GET /health` - Basic liveness check
- `GET /ready` - Full readiness with DB/Redis checks
- `GET /health/details` - Detailed system status

## Testing Focus
- Test health endpoints under various conditions
- Verify graceful shutdown behavior
- Test Redis failover scenarios

## Common Tasks
- Add new environment variables
- Improve logging and monitoring
- Configure rate limiting
- Set up alerting/notifications
