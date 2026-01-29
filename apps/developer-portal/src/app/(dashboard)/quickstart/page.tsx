'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { cn } from '@/lib/utils'

type Language = 'javascript' | 'python'

const steps = [
  {
    number: 1,
    title: 'Get your API keys',
    description: 'Create API keys in your dashboard to authenticate requests.',
    icon: Key,
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    number: 2,
    title: 'Install the SDK',
    description: 'Add the VerziHealth SDK to your project.',
    icon: Code2,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    number: 3,
    title: 'Initialize the Connect widget',
    description: 'Let users connect their healthcare providers.',
    icon: Link2,
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    number: 4,
    title: 'Fetch patient data',
    description: 'Access normalized health records via the API.',
    icon: Zap,
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
] as const

const installCode: Record<Language, string> = {
  javascript: 'npm install @verzihealth/sdk',
  python: 'pip install verzihealth',
}

const initCode: Record<Language, string> = {
  javascript: `import { VerziHealth } from '@verzihealth/sdk';

const client = new VerziHealth({
  apiKey: process.env.PLAIDHEALTH_API_KEY,
  environment: 'sandbox', // or 'production'
});`,
  python: `from verzihealth import VerziHealth

client = VerziHealth(
    api_key=os.environ['PLAIDHEALTH_API_KEY'],
    environment='sandbox'  # or 'production'
)`,
}

const linkCode: Record<Language, string> = {
  javascript: `// Server-side: Create a link token
const linkToken = await client.connections.createLinkToken({
  patientId: 'patient_123',
  redirectUri: 'https://yourapp.com/callback',
});

// Client-side: Open the Connect widget
import { openVerziHealthConnect } from '@verzihealth/sdk/browser';

openVerziHealthConnect({
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

const fetchCode: Record<Language, string> = {
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
  const [language, setLanguage] = useState<Language>('javascript')

  const handleLanguageChange = (value: string) => {
    setLanguage(value as Language)
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="gap-1.5">
            <Clock className="h-3 w-3" />
            5 min read
          </Badge>
          <Badge variant="outline" className="gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" />
            Beginner friendly
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Quickstart Guide</h1>
        <p className="text-muted-foreground mt-2">
          Get started with VerziHealth in under 5 minutes. This guide walks you through
          connecting healthcare providers and fetching patient data.
        </p>
      </div>

      {/* Steps Overview */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            What we&apos;ll build
          </CardTitle>
          <CardDescription>
            A complete healthcare data integration in 4 simple steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {steps.map((step) => (
              <div key={step.number} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg shrink-0', step.color)}>
                  <step.icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">
                    <span className="text-primary mr-1">{step.number}.</span>
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language Selector */}
      <div className="flex items-center gap-3 p-1 bg-muted rounded-lg w-fit">
        <span className="text-sm font-medium px-2 text-muted-foreground">Language:</span>
        <Tabs value={language} onValueChange={handleLanguageChange}>
          <TabsList className="bg-transparent">
            <TabsTrigger value="javascript" className="data-[state=active]:bg-background">JavaScript</TabsTrigger>
            <TabsTrigger value="python" className="data-[state=active]:bg-background">Python</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Step 1: API Keys */}
      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shrink-0">
            1
          </div>
          <div>
            <h2 className="text-xl font-bold">Get your API keys</h2>
            <p className="text-sm text-muted-foreground">Create credentials to authenticate your requests</p>
          </div>
        </div>

        <p className="text-muted-foreground">
          First, create API keys in your dashboard. We recommend using sandbox keys
          during development.
        </p>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
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
      </section>

      {/* Step 2: Install SDK */}
      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shrink-0">
            2
          </div>
          <div>
            <h2 className="text-xl font-bold">Install the SDK</h2>
            <p className="text-sm text-muted-foreground">Add VerziHealth to your project</p>
          </div>
        </div>

        <p className="text-muted-foreground">
          Install the VerziHealth SDK for your platform:
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
          filename={language === 'javascript' ? 'verzihealth.ts' : 'verzihealth.py'}
        />

        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm">
          <Zap className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-600 dark:text-amber-400">Security Tip</p>
            <p className="text-muted-foreground mt-1">
              Never expose your API key in client-side code. Always make API calls from
              your server.
            </p>
          </div>
        </div>
      </section>

      {/* Step 3: Connect Widget */}
      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shrink-0">
            3
          </div>
          <div>
            <h2 className="text-xl font-bold">Initialize the Connect widget</h2>
            <p className="text-sm text-muted-foreground">Let users link their healthcare providers</p>
          </div>
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
      </section>

      {/* Step 4: Fetch Data */}
      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shrink-0">
            4
          </div>
          <div>
            <h2 className="text-xl font-bold">Fetch patient data</h2>
            <p className="text-sm text-muted-foreground">Access normalized health records</p>
          </div>
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
      </section>

      {/* Success */}
      <Card className="border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 shrink-0">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-emerald-600 dark:text-emerald-400">You&apos;re all set!</h3>
            <p className="text-sm text-muted-foreground">
              You now have everything you need to start building with VerziHealth.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Next steps</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/docs" className="group">
            <Card className="h-full hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <h3 className="font-medium mb-1 group-hover:text-primary transition-colors">API Reference</h3>
                <p className="text-sm text-muted-foreground">
                  Explore all available endpoints and data types
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/sdks" className="group">
            <Card className="h-full hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <h3 className="font-medium mb-1 group-hover:text-primary transition-colors">Download SDKs</h3>
                <p className="text-sm text-muted-foreground">
                  Get SDKs for JavaScript, Python, and more
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  )
}
