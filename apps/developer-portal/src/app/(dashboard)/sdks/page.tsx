'use client'

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
} from 'lucide-react'

const sdks = [
  {
    name: 'JavaScript / TypeScript',
    package: '@plaidhealth/sdk',
    version: '1.2.0',
    description: 'Official SDK for Node.js and browser environments. Includes TypeScript definitions.',
    installCommand: 'npm install @plaidhealth/sdk',
    features: [
      'Full TypeScript support',
      'Browser Connect widget',
      'Promise-based API',
      'Automatic retries',
      'Request/response logging',
    ],
    links: {
      npm: 'https://www.npmjs.com/package/@plaidhealth/sdk',
      github: 'https://github.com/plaidhealth/plaidhealth-node',
      docs: '/docs#javascript',
    },
    color: 'bg-yellow-500',
  },
  {
    name: 'Python',
    package: 'plaidhealth',
    version: '1.1.0',
    description: 'Official Python SDK with type hints and async support for Python 3.8+.',
    installCommand: 'pip install plaidhealth',
    features: [
      'Type hints (PEP 484)',
      'Async/await support',
      'Pydantic models',
      'Automatic retries',
      'Comprehensive logging',
    ],
    links: {
      pypi: 'https://pypi.org/project/plaidhealth',
      github: 'https://github.com/plaidhealth/plaidhealth-python',
      docs: '/docs#python',
    },
    color: 'bg-blue-500',
  },
  {
    name: 'Ruby',
    package: 'plaidhealth',
    version: '0.9.0',
    description: 'Ruby SDK for Rails and other Ruby applications. Coming soon with full feature parity.',
    installCommand: 'gem install plaidhealth',
    features: [
      'Rails integration',
      'Faraday HTTP client',
      'Webhook verification',
      'Idiomatic Ruby API',
    ],
    links: {
      rubygems: 'https://rubygems.org/gems/plaidhealth',
      github: 'https://github.com/plaidhealth/plaidhealth-ruby',
      docs: '/docs#ruby',
    },
    color: 'bg-red-500',
    comingSoon: true,
  },
  {
    name: 'Go',
    package: 'github.com/plaidhealth/plaidhealth-go',
    version: '0.8.0',
    description: 'Go SDK with idiomatic error handling and context support.',
    installCommand: 'go get github.com/plaidhealth/plaidhealth-go',
    features: [
      'Context support',
      'Struct-based responses',
      'HTTP/2 support',
      'Minimal dependencies',
    ],
    links: {
      github: 'https://github.com/plaidhealth/plaidhealth-go',
      docs: '/docs#go',
    },
    color: 'bg-cyan-500',
    comingSoon: true,
  },
]

const codeExamples = {
  javascript: `import { PlaidHealth } from '@plaidhealth/sdk';

const client = new PlaidHealth({
  apiKey: process.env.PLAIDHEALTH_API_KEY,
});

// Fetch patient records
const records = await client.patients.getRecords('patient_123');

// Create a connection link
const link = await client.connections.createLinkToken({
  patientId: 'patient_123',
  redirectUri: 'https://app.com/callback',
});`,
  python: `from plaidhealth import PlaidHealth

client = PlaidHealth(api_key=os.environ['PLAIDHEALTH_API_KEY'])

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
        <h1 className="text-3xl font-bold tracking-tight">SDKs & Libraries</h1>
        <p className="text-muted-foreground mt-2">
          Official PlaidHealth SDKs to help you integrate faster. All SDKs are
          open-source and actively maintained.
        </p>
      </div>

      {/* SDK Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {sdks.map((sdk) => (
          <Card key={sdk.name} className="relative overflow-hidden">
            {sdk.comingSoon && (
              <Badge
                className="absolute top-4 right-4"
                variant="secondary"
              >
                Coming Soon
              </Badge>
            )}
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${sdk.color} flex items-center justify-center`}>
                  <Package className="h-5 w-5 text-white" />
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

              <div className="p-3 bg-muted rounded-md font-mono text-sm overflow-x-auto">
                {sdk.installCommand}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Features</h4>
                <ul className="space-y-1">
                  {sdk.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3 w-3 text-green-500" />
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
                      <ArrowUpRight className="mr-2 h-4 w-4" />
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
                      <ArrowUpRight className="mr-2 h-4 w-4" />
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
                      <ArrowUpRight className="mr-2 h-4 w-4" />
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
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Quick Examples</h2>
        <p className="text-muted-foreground">
          Get started with our most popular SDKs:
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold mb-3">JavaScript / TypeScript</h3>
            <CodeBlock
              code={codeExamples.javascript}
              language="typescript"
              filename="app.ts"
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">Python</h3>
            <CodeBlock
              code={codeExamples.python}
              language="python"
              filename="app.py"
            />
          </div>
        </div>
      </div>

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
            PlaidHealth using any HTTP client in any programming language.
          </p>

          <CodeBlock
            code={`curl -X GET "https://api.plaidhealth.com/v1/patients/patient_123/records" \\
  -H "Authorization: Bearer pfh_live_your_api_key" \\
  -H "Content-Type: application/json"`}
            language="bash"
            filename="Terminal"
          />

          <Button variant="outline" asChild>
            <a href="/docs">
              View API Documentation
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </a>
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
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="flex items-center justify-between py-6">
          <div>
            <h3 className="font-semibold">Need help or want to contribute?</h3>
            <p className="text-sm text-muted-foreground">
              Join our developer community on GitHub Discussions
            </p>
          </div>
          <Button asChild>
            <a
              href="https://github.com/plaidhealth/community/discussions"
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
