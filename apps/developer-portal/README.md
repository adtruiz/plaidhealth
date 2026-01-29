# VerziHealth Developer Portal

Developer dashboard for managing API integrations, monitoring usage, and accessing documentation.

## Features

### Dashboard
- Real-time API metrics (calls, success rate, response time)
- API endpoint status with per-endpoint health monitoring
- Recent activity feed
- Recent errors with copyable request IDs
- Getting started guide for new users

### API Key Management
- Create and manage API keys
- Environment-specific keys (sandbox/production)
- Key rotation and revocation

### Webhooks
- Create webhook endpoints
- Subscribe to events (patient.connected, data.updated, etc.)
- View delivery history and retry failed webhooks
- Real-time delivery status

### Team Management
- Invite team members via email
- Role-based access control (Owner, Admin, Developer, Viewer)
- Permissions matrix for each role

### Usage Analytics
- API call volume over time
- Error rate tracking
- Response time monitoring

### Documentation
- Interactive API reference
- Code examples with copy-to-clipboard
- SDK documentation

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- next-themes for dark mode

## Development

```bash
# From repository root
npm install
npm run dev:portal

# Or from this directory
npm install
npm run dev
```

Runs on http://localhost:3001

## Environment Switcher

The portal supports sandbox and production environments. Use the environment switcher in the header to toggle between them.
