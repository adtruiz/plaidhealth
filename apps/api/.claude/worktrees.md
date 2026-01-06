# Git Worktree Configuration

Use git worktrees to enable parallel development across multiple features/agents.

## Setup Commands

```bash
# Create worktrees for parallel development
git worktree add ../plaidhealth-fhir feature/fhir-enhancements
git worktree add ../plaidhealth-oauth feature/oauth-improvements
git worktree add ../plaidhealth-widget feature/widget-updates
git worktree add ../plaidhealth-hotfix hotfix/current
```

## Directory Structure

```
plaid-for-healthcare/
├── apps/api/apps/api/          # Main development (main branch)
├── plaidhealth-fhir/           # FHIR feature work
├── plaidhealth-oauth/          # OAuth feature work
├── plaidhealth-widget/         # Widget feature work
└── plaidhealth-hotfix/         # Emergency fixes
```

## Worktree Management

```bash
# List all worktrees
git worktree list

# Remove a worktree when done
git worktree remove ../plaidhealth-fhir

# Prune stale worktree references
git worktree prune
```

## Branch Naming Conventions

- `feature/<agent>-<description>` - New features by domain
- `fix/<agent>-<issue>` - Bug fixes by domain
- `hotfix/<description>` - Emergency production fixes
- `refactor/<area>` - Code improvements

## Agent-to-Worktree Mapping

| Agent | Default Worktree | Branch Pattern |
|-------|-----------------|----------------|
| FHIR Agent | plaidhealth-fhir | feature/fhir-* |
| OAuth Agent | plaidhealth-oauth | feature/oauth-* |
| Widget Agent | plaidhealth-widget | feature/widget-* |
| Database Agent | (main) | feature/db-* |
| Infra Agent | plaidhealth-hotfix | hotfix/* |

## Parallel Development Workflow

1. **Create worktree** for your agent's domain
2. **Work in isolation** without affecting other agents
3. **Push branch** when feature is ready
4. **Create PR** to merge back to main
5. **Remove worktree** after merge

## Conflict Resolution

When merging parallel work:
1. Merge main into feature branch first
2. Resolve conflicts in the worktree
3. Run full test suite
4. Create PR with passing tests
