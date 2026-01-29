# VerziHealth Multi-Agent Development

This directory contains configuration for multi-agent development workflows.

## Directory Structure

```
.claude/
├── README.md              # This file
├── agents/                # Agent specialization configs
│   ├── fhir-agent.md      # FHIR data integration
│   ├── oauth-agent.md     # Provider authentication
│   ├── widget-agent.md    # B2B widget API
│   ├── database-agent.md  # Data persistence
│   └── infra-agent.md     # DevOps & monitoring
├── contexts/              # Quick-start context files
│   ├── fhir-context.md    # FHIR agent context
│   ├── oauth-context.md   # OAuth agent context
│   └── widget-context.md  # Widget agent context
├── worktrees.md           # Git worktree configuration
└── task-delegation.md     # Task routing patterns
```

## Quick Start

### 1. Identify the Right Agent

Read `task-delegation.md` to route your task to the appropriate agent.

### 2. Load Agent Context

Before starting work, read the relevant files:
1. Agent config: `.claude/agents/{agent}-agent.md`
2. Agent context: `.claude/contexts/{agent}-context.md`

### 3. Use Worktrees for Isolation

For larger features, create a worktree:
```bash
git worktree add ../verzihealth-{feature} feature/{agent}-{description}
```

## Agent Communication

### Handoff Template

When delegating to another agent:

```markdown
## Task Handoff: {source-agent} → {target-agent}

### Current State
- What has been done
- What files were modified

### Required Work
- Specific tasks for target agent

### Files to Review
- path/to/file1.js
- path/to/file2.js

### Verification
- How to test the changes
- Expected outcomes
```

### Merge Coordination

When multiple agents work in parallel:

1. Each agent works in their worktree
2. Push feature branches when ready
3. Merge main into feature branch
4. Resolve conflicts in feature branch
5. Create PR with all tests passing
6. Code review by relevant agent
7. Merge to main

## Testing Strategy

### Unit Tests (Per Agent)
```bash
npm test -- --testPathPatterns="{domain}"
```

### Integration Tests
```bash
# Run full test suite
npm test

# Test specific endpoint
curl http://localhost:3000/health
```

### Production Verification
```bash
# After deploy, verify health
curl https://verzihealth-production.up.railway.app/health
curl https://verzihealth-production.up.railway.app/ready
```

## Deployment

All pushes to `main` trigger automatic deployment to Railway.

### Pre-Push Checklist
- [ ] All tests passing (`npm test`)
- [ ] No linting errors
- [ ] Syntax check (`node --check src/server.js`)
- [ ] Health endpoints working locally

## Getting Help

- **FHIR questions**: Load fhir-agent context
- **Auth issues**: Load oauth-agent context
- **API/Widget**: Load widget-agent context
- **DB problems**: Load database-agent context
- **Deploy issues**: Load infra-agent context
