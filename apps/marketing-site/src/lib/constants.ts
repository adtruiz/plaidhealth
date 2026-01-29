import {
  Database,
  Shield,
  Zap,
  Code2,
  Lock,
  Globe,
  Building2,
  Heart,
  FlaskConical,
  type LucideIcon,
} from 'lucide-react'

// Navigation
export const NAVIGATION_LINKS = [
  { name: 'Products', href: '/#features' },
  { name: 'Use Cases', href: '/use-cases' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Docs', href: '/docs' },
  { name: 'About', href: '/about' },
] as const

// Footer navigation
export const FOOTER_NAVIGATION = {
  product: [
    { name: 'Features', href: '/#features' },
    { name: 'Use Cases', href: '/use-cases' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Documentation', href: '/docs' },
    { name: 'Changelog', href: '/changelog' },
  ],
  developers: [
    { name: 'API Reference', href: '/docs' },
    { name: 'SDKs & Libraries', href: '/docs#sdks' },
    { name: 'Status', href: 'https://status.plaidhealth.com' },
    { name: 'GitHub', href: 'https://github.com/plaidhealth' },
    { name: 'Support', href: '/support' },
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Careers', href: '/about#careers' },
    { name: 'Contact', href: '/contact' },
    { name: 'Partners', href: '/partners' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'HIPAA Compliance', href: '/compliance' },
    { name: 'Security', href: '/security' },
    { name: 'BAA', href: '/baa' },
  ],
} as const

// Social links
export const SOCIAL_LINKS = [
  { name: 'GitHub', href: 'https://github.com/plaidhealth' },
  { name: 'Twitter', href: 'https://twitter.com/plaidhealth' },
  { name: 'LinkedIn', href: 'https://linkedin.com/company/plaidhealth' },
] as const

// Pricing tiers (shared between home page and pricing page)
export interface PricingFeature {
  name: string
  included: boolean
}

export interface PricingTier {
  name: string
  id: string
  price: string
  period: string
  description: string
  features: string[] | PricingFeature[]
  cta: string
  highlighted: boolean
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Startup',
    id: 'startup',
    price: '$299',
    period: '/month',
    description: 'For early-stage companies building their first healthcare integrations.',
    features: [
      'Up to 500 connected patients',
      '10 EMR & payer integrations',
      'Basic data endpoints',
      'Email support',
      'Sandbox environment',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Growth',
    id: 'growth',
    price: '$999',
    period: '/month',
    description: 'For scaling companies that need more connections and advanced features.',
    features: [
      'Up to 5,000 connected patients',
      'All 50+ integrations included',
      'Full data endpoints + webhooks',
      'Priority support (24hr SLA)',
      'Production + sandbox environments',
      'Advanced analytics dashboard',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations with high-volume needs and custom requirements.',
    features: [
      'Unlimited connected patients',
      'All integrations + custom builds',
      'Dedicated infrastructure',
      'Dedicated success manager',
      'Custom SLAs & BAA',
      'On-premise deployment options',
      'SOC 2 Type II attestation',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

// Detailed pricing tiers (for pricing page with included/excluded features)
export const DETAILED_PRICING_TIERS: PricingTier[] = [
  {
    name: 'Startup',
    id: 'startup',
    price: '$299',
    period: '/month',
    description: 'For early-stage companies building their first healthcare integrations.',
    features: [
      { name: 'Up to 500 connected patients', included: true },
      { name: '25,000 API calls/month', included: true },
      { name: 'Email support (48h response)', included: true },
      { name: '10 EMR & payer integrations', included: true },
      { name: 'Basic analytics dashboard', included: true },
      { name: 'Sandbox environment', included: true },
      { name: 'Webhooks', included: false },
      { name: 'Custom data mappings', included: false },
      { name: 'Dedicated support', included: false },
      { name: 'SLA guarantee', included: false },
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Growth',
    id: 'growth',
    price: '$999',
    period: '/month',
    description: 'For scaling companies that need more connections and advanced features.',
    features: [
      { name: 'Up to 5,000 connected patients', included: true },
      { name: '250,000 API calls/month', included: true },
      { name: 'Priority support (24h SLA)', included: true },
      { name: 'All 50+ integrations included', included: true },
      { name: 'Advanced analytics & insights', included: true },
      { name: 'Production + sandbox environments', included: true },
      { name: 'Webhooks & real-time sync', included: true },
      { name: 'Custom data mappings', included: true },
      { name: 'Dedicated support', included: false },
      { name: 'SLA guarantee', included: false },
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations with high-volume needs and custom requirements.',
    features: [
      { name: 'Unlimited connected patients', included: true },
      { name: 'Unlimited API calls', included: true },
      { name: 'Dedicated support (4h SLA)', included: true },
      { name: 'All integrations + custom builds', included: true },
      { name: 'Custom analytics & reporting', included: true },
      { name: 'Dedicated infrastructure', included: true },
      { name: 'Webhooks & real-time sync', included: true },
      { name: 'Custom data mappings', included: true },
      { name: 'Dedicated CSM & solutions engineer', included: true },
      { name: '99.99% uptime SLA + BAA', included: true },
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

// Data connection types
export interface DataConnection {
  name: string
  icon: LucideIcon
  description: string
  color: string
}

export const DATA_CONNECTIONS: DataConnection[] = [
  {
    name: 'EMR Systems',
    icon: Building2,
    description: 'Epic, Cerner, Allscripts, Meditech, and 40+ more',
    color: 'from-primary-500 to-primary-600',
  },
  {
    name: 'Payer Networks',
    icon: Heart,
    description: 'United, Aetna, BCBS, Cigna, Humana, and all major payers',
    color: 'from-mint-500 to-mint-600',
  },
  {
    name: 'Lab Systems',
    icon: FlaskConical,
    description: 'Quest, LabCorp, hospital labs, and specialty labs',
    color: 'from-primary-400 to-mint-500',
  },
]

// Platform features
export interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

export const PLATFORM_FEATURES: Feature[] = [
  {
    icon: Database,
    title: 'Unified Health Data API',
    description: 'One API endpoint to access patient records across all connected EMRs, payers, and labs. No fragmented integrations.',
  },
  {
    icon: Shield,
    title: 'HIPAA & SOC 2 Compliant',
    description: 'Enterprise-grade security with end-to-end encryption, comprehensive audit logs, and full regulatory compliance.',
  },
  {
    icon: Zap,
    title: 'Real-time Data Sync',
    description: 'Webhooks notify you instantly when patient data changes. Keep your application always in sync.',
  },
  {
    icon: Code2,
    title: 'Developer Experience',
    description: 'SDKs for Node, Python, Ruby, and more. Comprehensive documentation. Ship in days, not months.',
  },
  {
    icon: Lock,
    title: 'Patient-Controlled Consent',
    description: 'Our embeddable Connect widget handles patient authentication and consent securely and compliantly.',
  },
  {
    icon: Globe,
    title: 'FHIR-Normalized Data',
    description: 'We transform messy healthcare data into clean, consistent FHIR R4 resources automatically.',
  },
]

// Integration steps
export interface IntegrationStep {
  number: string
  title: string
  description: string
}

export const INTEGRATION_STEPS: IntegrationStep[] = [
  {
    number: '01',
    title: 'Embed PlaidHealth Connect',
    description: 'Add our pre-built Connect widget to your application. Patients select their healthcare provider and securely authorize access to their data.',
  },
  {
    number: '02',
    title: 'Receive Access Credentials',
    description: 'After successful patient authorization, receive a secure access token via webhook. Store it safely for subsequent API calls.',
  },
  {
    number: '03',
    title: 'Query Unified Health Data',
    description: 'Use our REST API to fetch conditions, medications, lab results, encounters, claims, and more - all normalized to FHIR R4.',
  },
]

// Trusted by companies
export const TRUSTED_BY = [
  { name: 'HealthSync', logo: 'HS' },
  { name: 'MedFlow', logo: 'MF' },
  { name: 'CareStack', logo: 'CS' },
  { name: 'LifeData', logo: 'LD' },
  { name: 'WellPath', logo: 'WP' },
] as const

// FAQ items
export interface FAQItem {
  question: string
  answer: string
}

export const PRICING_FAQS: FAQItem[] = [
  {
    question: 'What counts as a connected patient?',
    answer: 'A connected patient is any unique patient who has authorized access to their health data through our Connect widget. Once connected, they remain counted for the duration of their active connection.',
  },
  {
    question: 'Can I switch plans anytime?',
    answer: "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll have immediate access to additional features. When downgrading, the change takes effect at your next billing cycle.",
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! We offer a 14-day free trial on both Startup and Growth plans with full access to all features. No credit card required to start.',
  },
  {
    question: 'What EMR and payer integrations are included?',
    answer: 'All plans include access to major EMRs (Epic, Cerner, Allscripts, etc.) and payers (BCBS, Humana, Aetna, etc.). The Startup plan includes 10 integrations of your choice, while Growth and Enterprise include all 50+.',
  },
  {
    question: 'Do you provide a HIPAA BAA?',
    answer: 'Yes, we provide Business Associate Agreements (BAA) for all paid plans. Our platform is fully HIPAA compliant and SOC 2 Type II certified.',
  },
  {
    question: 'What happens if I exceed my API limit?',
    answer: "We'll notify you when you reach 80% of your limit. If you exceed it, you can either upgrade your plan or purchase additional API calls at $0.01 per call.",
  },
]

// Contact methods
export const CONTACT_METHODS = [
  {
    title: 'Email Us',
    description: 'For general inquiries',
    value: 'hello@plaidhealth.com',
    href: 'mailto:hello@plaidhealth.com',
  },
  {
    title: 'Sales',
    description: 'For pricing & demos',
    value: 'sales@plaidhealth.com',
    href: 'mailto:sales@plaidhealth.com',
  },
  {
    title: 'Headquarters',
    description: 'San Francisco, CA',
    value: '548 Market St, Suite 95149',
    href: '#',
  },
] as const

// Inquiry types for contact form
export const INQUIRY_TYPES = [
  'Request a demo',
  'Pricing inquiry',
  'Technical question',
  'Partnership opportunity',
  'Other',
] as const
