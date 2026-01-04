'use client'

import { motion } from 'framer-motion'
import {
  Shield,
  Zap,
  Code,
  Database,
  Lock,
  RefreshCw,
  CheckCircle,
  ArrowRight,
  Building2,
  Heart,
  FileText,
} from 'lucide-react'
import Button from '@/components/Button'
import AnimatedSection, { AnimatedCard, SlideIn } from '@/components/AnimatedSection'

const integrations = [
  { name: 'Epic', category: 'EHR' },
  { name: 'Cerner', category: 'EHR' },
  { name: 'Allscripts', category: 'EHR' },
  { name: 'Meditech', category: 'EHR' },
  { name: 'Humana', category: 'Payer' },
  { name: 'BCBS', category: 'Payer' },
  { name: 'Aetna', category: 'Payer' },
  { name: 'Cigna', category: 'Payer' },
]

const features = [
  {
    icon: Database,
    title: 'Unified API',
    description: 'One API to access patient records from any EMR or payer. No more building separate integrations.',
  },
  {
    icon: Shield,
    title: 'HIPAA Compliant',
    description: 'Enterprise-grade security with end-to-end encryption, audit logs, and full HIPAA compliance.',
  },
  {
    icon: Zap,
    title: 'Real-time Sync',
    description: 'Get webhooks for data changes. Keep your app in sync with the source of truth.',
  },
  {
    icon: Code,
    title: 'Developer First',
    description: 'SDKs for every major language. Comprehensive docs. Get started in minutes, not months.',
  },
  {
    icon: Lock,
    title: 'Patient Consent',
    description: 'Built-in consent management with our Connect widget. Patients authorize data sharing securely.',
  },
  {
    icon: RefreshCw,
    title: 'Normalized Data',
    description: 'We transform messy healthcare data into clean, consistent FHIR-based resources.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Embed Connect',
    description: 'Add our Connect widget to your app. Patients select their provider and authenticate.',
  },
  {
    number: '02',
    title: 'Get Access Token',
    description: 'Receive a secure access token after successful authentication. Store it for API calls.',
  },
  {
    number: '03',
    title: 'Fetch Health Data',
    description: 'Query our unified API for conditions, medications, labs, encounters, and more.',
  },
]

const testimonials = [
  {
    quote: "PlaidHealth cut our integration time from 6 months to 2 weeks. It's exactly what the healthcare industry needed.",
    author: 'Sarah Chen',
    role: 'CTO, HealthSync',
    company: 'Digital Health Startup',
  },
  {
    quote: "The data normalization alone saves us hundreds of engineering hours. Clean, consistent data every time.",
    author: 'Michael Torres',
    role: 'VP Engineering',
    company: 'Clinical Trial Platform',
  },
  {
    quote: "Finally, an API that understands healthcare. HIPAA compliance baked in, not bolted on.",
    author: 'Dr. Emily Watson',
    role: 'Chief Medical Officer',
    company: 'Telehealth Provider',
  },
]

export default function Home() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 gradient-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-700 mb-6">
                <Shield className="w-4 h-4 mr-1.5" />
                HIPAA Compliant & SOC 2 Certified
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight"
            >
              The <span className="gradient-text">Plaid for Healthcare</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto"
            >
              One API to connect to patient health data from any EMR or payer.
              Build healthcare apps faster with our unified, HIPAA-compliant platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button href="/contact" size="lg">
                Get API Access
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button href="/docs" variant="outline" size="lg">
                View Documentation
              </Button>
            </motion.div>
          </div>

          {/* Code Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-16 max-w-4xl mx-auto"
          >
            <div className="rounded-xl bg-gray-900 shadow-2xl overflow-hidden">
              <div className="flex items-center space-x-2 px-4 py-3 bg-gray-800">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-sm text-gray-400">api-example.js</span>
              </div>
              <pre className="p-6 text-sm overflow-x-auto">
                <code className="text-gray-300">
{`import PlaidHealth from '@plaidhealth/node';

const client = new PlaidHealth({ apiKey: process.env.PLAIDHEALTH_KEY });

// Fetch patient medications
const medications = await client.medications.list({
  accessToken: 'patient_access_token',
});

// Returns normalized FHIR MedicationStatement resources
console.log(medications.data);
// [{ resourceType: 'MedicationStatement', status: 'active', ... }]`}
                </code>
              </pre>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <p className="text-center text-sm font-medium text-gray-500 mb-8">
              CONNECT TO 50+ EMRs AND PAYERS
            </p>
          </AnimatedSection>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-8 items-center">
            {integrations.map((integration, index) => (
              <AnimatedCard key={integration.name} delay={index * 0.05}>
                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center mb-2">
                    {integration.category === 'EHR' ? (
                      <Building2 className="w-5 h-5 text-gray-600" />
                    ) : (
                      <Heart className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{integration.name}</span>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Everything you need to build healthcare apps
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Stop wrestling with healthcare data. Focus on building great products.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <AnimatedCard key={feature.title} delay={index * 0.1}>
                <div className="p-6 rounded-xl bg-white border border-gray-200 hover:border-primary-300 transition-colors h-full">
                  <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 sm:py-28 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              How it works
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Get patient health data in three simple steps
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <SlideIn key={step.number} delay={index * 0.15} direction={index % 2 === 0 ? 'left' : 'right'}>
                <div className="relative">
                  <div className="text-6xl font-bold text-primary-100 mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">
                    {step.description}
                  </p>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 right-0 translate-x-1/2">
                      <ArrowRight className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>
              </SlideIn>
            ))}
          </div>
        </div>
      </section>

      {/* Data Types Section */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <SlideIn direction="left">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Access comprehensive health data
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Our API provides access to a wide range of patient health information,
                all normalized to FHIR R4 standards for consistency across providers.
              </p>
              <ul className="space-y-4">
                {[
                  'Conditions & Diagnoses',
                  'Medications & Prescriptions',
                  'Lab Results & Vitals',
                  'Encounters & Visits',
                  'Immunizations',
                  'Claims & Coverage',
                  'Clinical Notes',
                  'Allergies',
                ].map((item) => (
                  <li key={item} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-primary-600 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </SlideIn>

            <SlideIn direction="right" delay={0.2}>
              <div className="rounded-xl bg-gray-900 shadow-xl overflow-hidden">
                <div className="flex items-center space-x-2 px-4 py-3 bg-gray-800">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Response Example</span>
                </div>
                <pre className="p-6 text-sm overflow-x-auto">
                  <code className="text-gray-300">
{`{
  "resourceType": "Condition",
  "id": "cond-12345",
  "clinicalStatus": {
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
      "code": "active"
    }]
  },
  "code": {
    "coding": [{
      "system": "http://hl7.org/fhir/sid/icd-10-cm",
      "code": "E11.9",
      "display": "Type 2 diabetes mellitus"
    }]
  },
  "onsetDateTime": "2020-03-15"
}`}
                  </code>
                </pre>
              </div>
            </SlideIn>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 sm:py-28 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Trusted by healthcare innovators
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Teams building the future of healthcare use PlaidHealth
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <AnimatedCard key={testimonial.author} delay={index * 0.1}>
                <div className="p-8 rounded-xl bg-white border border-gray-200 h-full flex flex-col">
                  <blockquote className="text-gray-700 flex-grow">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="font-semibold text-gray-900">
                      {testimonial.author}
                    </div>
                    <div className="text-sm text-gray-500">
                      {testimonial.role}
                    </div>
                    <div className="text-sm text-gray-500">
                      {testimonial.company}
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-primary-600 to-accent-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to build with PlaidHealth?
            </h2>
            <p className="text-lg text-primary-100 max-w-2xl mx-auto mb-10">
              Join hundreds of developers building the next generation of healthcare applications.
              Get started with our free sandbox today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                href="/contact"
                variant="secondary"
                size="lg"
                className="bg-white text-primary-600 hover:bg-gray-100"
              >
                Request API Access
              </Button>
              <Button
                href="/docs"
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white/10"
              >
                Read the Docs
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  )
}
