'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CodeBlock } from '@/components/code-block'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Code2,
  Key,
  Link2,
  Rocket,
  Zap,
} from 'lucide-react'

const steps = [
  {
    number: 1,
    title: 'Get your API keys',
    description: 'Create API keys in your dashboard to authenticate requests.',
    icon: Key,
  },
  {
    number: 2,
    title: 'Install the SDK',
    description: 'Add the PlaidHealth SDK to your project.',
    icon: Code2,
  },
  {
    number: 3,
    title: 'Initialize the Connect widget',
    description: 'Let users connect their healthcare providers.',
    icon: Link2,
  },
  {
    number: 4,
    title: 'Fetch patient data',
    description: 'Access normalized health records via the API.',
    icon: Zap,
  },
]

const installCode = {
  javascript: `npm install @plaidhealth/sdk`,
  python: `pip install plaidhealth`,
}

const initCode = {
  javascript: `import { PlaidHealth } from '@plaidhealth/sdk';

const client = new PlaidHealth({
  apiKey: process.env.PLAIDHEALTH_API_KEY,
  environment: 'sandbox', // or 'production'
});`,
  python: `from plaidhealth import PlaidHealth

client = PlaidHealth(
    api_key=os.environ['PLAIDHEALTH_API_KEY'],
    environment='sandbox'  # or 'production'
)`,
}

const linkCode = {
  javascript: `// Server-side: Create a link token
const linkToken = await client.connections.createLinkToken({
  patientId: 'patient_123',
  redirectUri: 'https://yourapp.com/callback',
});

// Client-side: Open the Connect widget
import { openPlaidHealthConnect } from '@plaidhealth/sdk/browser';

openPlaidHealthConnect({
  token: linkToken,
  onSuccess: async (publicToken) => {
    // Exchange public token for access token (server-side)
    const response = await fetch('/api/exchange-token', {
      method: 'POST',
      body: JSON.stringify({ publicToken }),
    });
  },
  onExit: () => {
    console.log('User exited Connect');
  },
});`,
  python: `# Server-side: Create a link token
link_response = client.connections.create_link_token(
    patient_id='patient_123',
    redirect_uri='https://yourapp.com/callback'
)

# Return link_token to frontend to initialize Connect widget
print(link_response.link_token)

# After user completes Connect flow, exchange the public token
access_response = client.connections.exchange_public_token(
    public_token=public_token_from_frontend
)

access_token = access_response.access_token
connection_id = access_response.connection_id`,
}

const fetchCode = {
  javascript: `// Fetch all health records
const records = await client.patients.getRecords('patient_123');

console.log('Patient:', records.patient);
console.log('Medications:', records.medications);
console.log('Conditions:', records.conditions);
console.log('Labs:', records.labs);

// Fetch specific data types
const medications = await client.patients.getMedications('patient_123');
const labs = await client.patients.getLabs('patient_123', {
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});`,
  python: `# Fetch all health records
records = client.patients.get_records('patient_123')

print('Patient:', records.patient)
print('Medications:', records.medications)
print('Conditions:', records.conditions)
print('Labs:', records.labs)

# Fetch specific data types
medications = client.patients.get_medications('patient_123')
labs = client.patients.get_labs(
    'patient_123',
    start_date='2024-01-01',
    end_date='2024-12-31'
)`,
}

export default function QuickstartPage() {
  const [language, setLanguage] = useState<'javascript' | 'python'>('javascript')

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            5 min read
          </Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Quickstart Guide</h1>
        <p className="text-muted-foreground mt-2">
          Get started with PlaidHealth in under 5 minutes. This guide walks you through
          connecting healthcare providers and fetching patient data.
        </p>
      </div>

      {/* Steps Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            What we will build
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {steps.map((step) => (
              <div key={step.number} className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">
                  {step.number}
                </div>
                <div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Language:</span>
        <Tabs value={language} onValueChange={(v) => setLanguage(v as any)}>
          <TabsList>
            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Step 1: API Keys */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            1
          </div>
          <h2 className="text-2xl font-bold">Get your API keys</h2>
        </div>

        <p className="text-muted-foreground">
          First, create API keys in your dashboard. We recommend using sandbox keys
          during development.
        </p>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Create your first API key</p>
                <p className="text-sm text-muted-foreground">
                  Go to the API Keys page to generate credentials
                </p>
              </div>
              <Button asChild>
                <Link href="/api-keys">
                  Create Key
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step 2: Install SDK */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            2
          </div>
          <h2 className="text-2xl font-bold">Install the SDK</h2>
        </div>

        <p className="text-muted-foreground">
          Install the PlaidHealth SDK for your platform:
        </p>

        <CodeBlock
          code={installCode[language]}
          language="bash"
          filename="Terminal"
        />

        <p className="text-muted-foreground">
          Then initialize the client with your API key:
        </p>

        <CodeBlock
          code={initCode[language]}
          language={language === 'javascript' ? 'typescript' : 'python'}
          filename={language === 'javascript' ? 'plaidhealth.ts' : 'plaidhealth.py'}
        />

        <div className="flex items-start gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
          <span className="text-yellow-500 font-medium">Tip:</span>
          <span className="text-muted-foreground">
            Never expose your API key in client-side code. Always make API calls from
            your server.
          </span>
        </div>
      </div>

      {/* Step 3: Connect Widget */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            3
          </div>
          <h2 className="text-2xl font-bold">Initialize the Connect widget</h2>
        </div>

        <p className="text-muted-foreground">
          The Connect widget lets users securely link their healthcare providers.
          Create a link token on your server, then open the widget on the client:
        </p>

        <CodeBlock
          code={linkCode[language]}
          language={language === 'javascript' ? 'typescript' : 'python'}
          filename={language === 'javascript' ? 'connect.ts' : 'connect.py'}
          showLineNumbers
        />
      </div>

      {/* Step 4: Fetch Data */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            4
          </div>
          <h2 className="text-2xl font-bold">Fetch patient data</h2>
        </div>

        <p className="text-muted-foreground">
          Once a connection is established, you can fetch normalized health records:
        </p>

        <CodeBlock
          code={fetchCode[language]}
          language={language === 'javascript' ? 'typescript' : 'python'}
          filename={language === 'javascript' ? 'fetch-data.ts' : 'fetch_data.py'}
          showLineNumbers
        />
      </div>

      {/* Success */}
      <Card className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border-green-500/20">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">You are all set!</h3>
            <p className="text-sm text-muted-foreground">
              You now have everything you need to start building with PlaidHealth.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Next steps</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/docs">
            <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <h3 className="font-medium mb-1">API Reference</h3>
                <p className="text-sm text-muted-foreground">
                  Explore all available endpoints and data types
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/sdks">
            <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <h3 className="font-medium mb-1">Download SDKs</h3>
                <p className="text-sm text-muted-foreground">
                  Get SDKs for JavaScript, Python, and more
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
