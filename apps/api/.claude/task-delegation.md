# Task Delegation Patterns

How to route tasks to the appropriate specialized agent.

## Task Classification

### FHIR Agent Tasks
Keywords: `FHIR`, `patient data`, `labs`, `medications`, `conditions`, `encounters`, `observations`, `normalize`, `resource`

Examples:
- "Add support for FHIR Immunization resources"
- "Fix lab result parsing for Quest data"
- "Improve medication normalization"
- "Handle FHIR pagination correctly"

### OAuth Agent Tasks
Keywords: `OAuth`, `authentication`, `token`, `PKCE`, `authorization`, `provider`, `login`, `connect`, `refresh`

Examples:
- "Add new healthcare provider integration"
- "Fix token refresh for Cerner"
- "Handle OAuth error from Anthem"
- "Update PKCE implementation"

### Widget Agent Tasks
Keywords: `widget`, `API key`, `B2B`, `public token`, `exchange`, `session`, `provider list`

Examples:
- "Add widget customization options"
- "Fix API key validation"
- "Improve provider selection flow"
- "Add webhook for new connections"

### Database Agent Tasks
Keywords: `database`, `query`, `PostgreSQL`, `migration`, `schema`, `encryption`, `audit`

Examples:
- "Add new column to connections table"
- "Optimize slow query in health records"
- "Implement data retention policy"
- "Fix encryption key rotation"

### Infrastructure Agent Tasks
Keywords: `deploy`, `Railway`, `Redis`, `health check`, `monitoring`, `logging`, `environment`

Examples:
- "Add new environment variable"
- "Fix health check timeout"
- "Improve logging for errors"
- "Configure rate limiting"

## Multi-Agent Tasks

Some tasks require coordination between agents:

### Adding New Provider
1. **OAuth Agent**: Add provider OAuth configuration
2. **FHIR Agent**: Add FHIR endpoint mappings and normalizers
3. **Widget Agent**: Update provider list and logos
4. **Database Agent**: Add any provider-specific columns

### Performance Optimization
1. **Database Agent**: Query optimization
2. **Infrastructure Agent**: Caching configuration
3. **FHIR Agent**: Request batching

### Security Audit
1. **OAuth Agent**: Token handling review
2. **Database Agent**: Encryption verification
3. **Infrastructure Agent**: Logging completeness

## Escalation Patterns

When a task spans multiple domains:
1. Identify primary agent (most code changes)
2. Create subtasks for supporting agents
3. Primary agent coordinates integration
4. All agents test their components
5. Integration test on merge

## Context Handoff

When delegating to another agent, include:
- Current state of work
- Relevant file paths
- Test commands to verify
- Expected behavior
- Known issues/constraints
