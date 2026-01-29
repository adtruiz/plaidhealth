'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CodeBlock } from '@/components/code-block'
import {
  ArrowUpRight,
  Check,
  Download,
  Github,
  Package,
  Terminal,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const sdks = [
  {
    name: 'JavaScript / TypeScript',
    package: '@verzihealth/sdk',
    version: '1.2.0',
    description: 'Official SDK for Node.js and browser environments. Includes TypeScript definitions.',
    installCommand: 'npm install @verzihealth/sdk',
    features: [
      'Full TypeScript support',
      'Browser Connect widget',
      'Promise-based API',
      'Automatic retries',
      'Request/response logging',
    ],
    links: {
      npm: 'https://www.npmjs.com/package/@verzihealth/sdk',
      github: 'https://github.com/verzihealth/verzihealth-node',
      docs: '/docs#javascript',
    },
    color: 'bg-amber-500',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
  },
  {
    name: 'Python',
    package: 'verzihealth',
    version: '1.1.0',
    description: 'Official Python SDK with type hints and async support for Python 3.8+.',
    installCommand: 'pip install verzihealth',
    features: [
      'Type hints (PEP 484)',
      'Async/await support',
      'Pydantic models',
      'Automatic retries',
      'Comprehensive logging',
    ],
    links: {
      pypi: 'https://pypi.org/project/verzihealth',
      github: 'https://github.com/verzihealth/verzihealth-python',
      docs: '/docs#python',
    },
    color: 'bg-blue-500',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
  {
    name: 'Ruby',
    package: 'verzihealth',
    version: '0.9.0',
    description: 'Ruby SDK for Rails and other Ruby applications. Coming soon with full feature parity.',
    installCommand: 'gem install verzihealth',
    features: [
      'Rails integration',
      'Faraday HTTP client',
      'Webhook verification',
      'Idiomatic Ruby API',
    ],
    links: {
      rubygems: 'https://rubygems.org/gems/verzihealth',
      github: 'https://github.com/verzihealth/verzihealth-ruby',
      docs: '/docs#ruby',
    },
    color: 'bg-red-500',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-500',
    comingSoon: true,
  },
  {
    name: 'Go',
    package: 'github.com/verzihealth/verzihealth-go',
    version: '0.8.0',
    description: 'Go SDK with idiomatic error handling and context support.',
    installCommand: 'go get github.com/verzihealth/verzihealth-go',
    features: [
      'Context support',
      'Struct-based responses',
      'HTTP/2 support',
      'Minimal dependencies',
    ],
    links: {
      github: 'https://github.com/verzihealth/verzihealth-go',
      docs: '/docs#go',
    },
    color: 'bg-cyan-500',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-500',
    comingSoon: true,
  },
]

const codeExamples = {
  javascript: `import { VerziHealth } from '@verzihealth/sdk';

const client = new VerziHealth({
  apiKey: process.env.PLAIDHEALTH_API_KEY,
});

// Fetch patient records
const records = await client.patients.getRecords('patient_123');

// Create a connection link
const link = await client.connections.createLinkToken({
  patientId: 'patient_123',
  redirectUri: 'https://app.com/callback',
});`,
  python: `from verzihealth import VerziHealth

client = VerziHealth(api_key=os.environ['PLAIDHEALTH_API_KEY'])

# Fetch patient records
records = client.patients.get_records('patient_123')

# Create a connection link
link = client.connections.create_link_token(
    patient_id='patient_123',
    redirect_uri='https://app.com/callback'
)`,
}

export default function SDKsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">SDKs & Libraries</h1>
        <p className="text-muted-foreground mt-2">
          Official VerziHealth SDKs to help you integrate faster. All SDKs are
          open-source and actively maintained.
        </p>
      </div>

      {/* SDK Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {sdks.map((sdk) => (
          <Card key={sdk.name} className="relative overflow-hidden">
            {sdk.comingSoon && (
              <Badge
                className="absolute top-4 right-4 z-10"
                variant="secondary"
              >
                Coming Soon
              </Badge>
            )}
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', sdk.iconBg)}>
                  <Package className={cn('h-5 w-5', sdk.iconColor)} />
                </div>
                <div>
                  <CardTitle className="text-lg">{sdk.name}</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {sdk.package} v{sdk.version}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{sdk.description}</p>

              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
                <Terminal className="h-4 w-4 text-muted-foreground shrink-0" />
                <code className="flex-1 truncate">{sdk.installCommand}</code>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Features</h4>
                <ul className="space-y-1.5">
                  {sdk.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {sdk.links.github && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={sdk.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Github className="mr-2 h-4 w-4" />
                      GitHub
                    </a>
                  </Button>
                )}
                {sdk.links.npm && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={sdk.links.npm}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      npm
                    </a>
                  </Button>
                )}
                {sdk.links.pypi && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={sdk.links.pypi}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      PyPI
                    </a>
                  </Button>
                )}
                {sdk.links.rubygems && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={sdk.links.rubygems}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      RubyGems
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Code Examples */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Quick Examples</h2>
        <p className="text-muted-foreground">
          Get started with our most popular SDKs:
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                <Package className="h-3.5 w-3.5 text-amber-500" />
              </div>
              JavaScript / TypeScript
            </h3>
            <CodeBlock
              code={codeExamples.javascript}
              language="typescript"
              filename="app.ts"
            />
          </div>
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                <Package className="h-3.5 w-3.5 text-blue-500" />
              </div>
              Python
            </h3>
            <CodeBlock
              code={codeExamples.python}
              language="python"
              filename="app.py"
            />
          </div>
        </div>
      </section>

      {/* REST API */}
      <Card>
        <CardHeader>
          <CardTitle>REST API</CardTitle>
          <CardDescription>
            Not seeing your language? Use our REST API directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All our SDKs are wrappers around our REST API. You can integrate with
            VerziHealth using any HTTP client in any programming language.
          </p>

          <CodeBlock
            code={`curl -X GET "https://api.verzihealth.com/v1/patients/patient_123/records" \\
  -H "Authorization: Bearer pfh_live_your_api_key" \\
  -H "Content-Type: application/json"`}
            language="bash"
            filename="Terminal"
          />

          <Button variant="outline" asChild>
            <Link href="/docs">
              View API Documentation
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* OpenAPI */}
      <Card>
        <CardHeader>
          <CardTitle>OpenAPI Specification</CardTitle>
          <CardDescription>
            Generate clients for any language using our OpenAPI spec.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <a href="/api/openapi.yaml" download>
                <Download className="mr-2 h-4 w-4" />
                Download OpenAPI Spec (YAML)
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/api/openapi.json" download>
                <Download className="mr-2 h-4 w-4" />
                Download OpenAPI Spec (JSON)
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Community */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-6">
          <div>
            <h3 className="font-semibold">Need help or want to contribute?</h3>
            <p className="text-sm text-muted-foreground">
              Join our developer community on GitHub Discussions
            </p>
          </div>
          <Button asChild>
            <a
              href="https://github.com/verzihealth/community/discussions"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="mr-2 h-4 w-4" />
              Join Community
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
