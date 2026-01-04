# PlaidHealth

**Plaid for Healthcare** - Unified API for patient health data aggregation from EMRs and payers.

## Monorepo Structure

```
plaidhealth/
├── apps/
│   ├── api/                 # Core API - FHIR aggregation, normalization, deduplication
│   ├── developer-portal/    # Developer dashboard, API docs, SDK downloads
│   └── marketing-site/      # Public marketing website, pricing, demos
├── packages/
│   └── shared/              # Shared utilities, types, constants
└── package.json             # Workspace root
```

## Apps

| App | Port | Description |
|-----|------|-------------|
| `@plaidhealth/api` | 3000 | Core FHIR API with Connect Widget |
| `@plaidhealth/developer-portal` | 3001 | Developer dashboard & docs |
| `@plaidhealth/marketing-site` | 3002 | Marketing website |

## Quick Start

```bash
# Install all dependencies
npm install

# Run API
npm run dev:api

# Run developer portal
npm run dev:portal

# Run marketing site
npm run dev:marketing
```

## Development

This repo uses npm workspaces. Each app can be developed independently:

```bash
# Work on specific app
cd apps/api && npm run dev

# Or from root
npm run dev --workspace=@plaidhealth/api
```

## Documentation

- [API Documentation](./apps/api/README.md)
- [Developer Portal](./apps/developer-portal/README.md)
- [Marketing Site](./apps/marketing-site/README.md)

## License

Proprietary - All rights reserved
