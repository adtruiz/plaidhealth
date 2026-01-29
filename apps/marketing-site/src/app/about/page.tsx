'use client'

import { Target, Eye, Users, Award, Globe, Shield } from 'lucide-react'
import Button from '@/components/Button'
import AnimatedSection, { AnimatedCard, SlideIn } from '@/components/AnimatedSection'

const stats = [
  { label: 'Healthcare Organizations', value: '200+' },
  { label: 'Patient Records Processed', value: '10M+' },
  { label: 'API Uptime', value: '99.99%' },
  { label: 'EMR & Payer Integrations', value: '50+' },
]

const values = [
  {
    icon: Shield,
    title: 'Security First',
    description: 'Patient data security is non-negotiable. We build with HIPAA compliance and data protection at the core of everything we do.',
  },
  {
    icon: Users,
    title: 'Patient-Centered',
    description: 'We believe patients should have control over their health data. Our consent-first approach puts patients in the driver\'s seat.',
  },
  {
    icon: Target,
    title: 'Developer Experience',
    description: 'Healthcare developers deserve great tools. We obsess over documentation, SDKs, and making integration as simple as possible.',
  },
  {
    icon: Globe,
    title: 'Interoperability',
    description: 'Healthcare data shouldn\'t be siloed. We\'re building the infrastructure to make health data flow seamlessly where it\'s needed.',
  },
]

const team = [
  {
    name: 'Alex Chen',
    role: 'CEO & Co-Founder',
    bio: 'Former VP of Engineering at a digital health unicorn. Built healthcare APIs at scale.',
  },
  {
    name: 'Sarah Martinez',
    role: 'CTO & Co-Founder',
    bio: 'Ex-Epic principal engineer. Deep expertise in EHR integrations and FHIR standards.',
  },
  {
    name: 'Michael Thompson',
    role: 'Chief Medical Officer',
    bio: 'Practicing physician and health informaticist. Bridges the gap between tech and clinical.',
  },
  {
    name: 'Emily Park',
    role: 'VP of Engineering',
    bio: 'Built Stripe\'s core payments infrastructure. Expert in API design at scale.',
  },
  {
    name: 'David Kim',
    role: 'VP of Compliance',
    bio: 'Former HIPAA compliance officer at major health system. Leads our security program.',
  },
  {
    name: 'Rachel Green',
    role: 'Head of Customer Success',
    bio: 'Helped 100+ health tech companies navigate EMR integrations at previous role.',
  },
]

const investors = [
  'Andreessen Horowitz',
  'General Catalyst',
  'Bessemer Venture Partners',
  'Box Group',
]

export default function AboutPage() {
  return (
    <div className="pt-24">
      {/* Hero Section */}
      <section className="py-16 sm:py-20 gradient-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <AnimatedSection>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
                Making healthcare data accessible
              </h1>
              <p className="mt-6 text-lg text-gray-600">
                We&apos;re building the infrastructure to unlock patient health data,
                enabling a new generation of healthcare applications that improve outcomes
                and put patients in control of their data.
              </p>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <AnimatedSection key={stat.label} delay={index * 0.1}>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {stat.label}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <SlideIn direction="left">
              <div>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary-100 mb-6">
                  <Target className="w-7 h-7 text-primary-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
                <p className="text-lg text-gray-600 mb-6">
                  Healthcare data has been locked in silos for too long. Patients struggle
                  to access their own records. Developers spend months building one-off
                  integrations. Innovation is blocked by infrastructure complexity.
                </p>
                <p className="text-lg text-gray-600">
                  We&apos;re changing that. VerziHealth provides a single, unified API to access
                  patient health data from any source—EMRs, payers, labs, and more. We handle
                  the complexity of healthcare integrations so developers can focus on building
                  products that actually improve health outcomes.
                </p>
              </div>
            </SlideIn>

            <SlideIn direction="right" delay={0.2}>
              <div>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent-100 mb-6">
                  <Eye className="w-7 h-7 text-accent-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
                <p className="text-lg text-gray-600 mb-6">
                  We envision a world where health data flows seamlessly to where it&apos;s
                  needed—with patient consent at the center. Where any developer can build
                  healthcare applications without becoming an expert in HL7 or FHIR.
                </p>
                <p className="text-lg text-gray-600">
                  Just as Plaid transformed fintech by making banking data accessible,
                  we&apos;re building the infrastructure to power the next generation of
                  healthcare innovation.
                </p>
              </div>
            </SlideIn>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Our Values</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              The principles that guide how we build and operate
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <AnimatedCard key={value.title} delay={index * 0.1}>
                <div className="bg-white rounded-xl p-6 h-full border border-gray-200">
                  <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center mb-4">
                    <value.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {value.description}
                  </p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Leadership Team</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Experienced leaders from healthcare, fintech, and enterprise software
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <AnimatedCard key={member.name} delay={index * 0.1}>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 mb-4 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {member.name}
                  </h3>
                  <p className="text-primary-600 text-sm font-medium mb-3">
                    {member.role}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {member.bio}
                  </p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Investors Section */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <p className="text-sm font-medium text-gray-500 mb-8">
              BACKED BY LEADING INVESTORS
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
              {investors.map((investor) => (
                <span key={investor} className="text-lg font-semibold text-gray-400">
                  {investor}
                </span>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Careers CTA */}
      <section id="careers" className="py-16 sm:py-24 bg-gradient-to-br from-primary-600 to-accent-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <Award className="w-12 h-12 text-white/80 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">
              Join our team
            </h2>
            <p className="text-lg text-primary-100 max-w-2xl mx-auto mb-8">
              We&apos;re hiring engineers, product managers, and go-to-market leaders
              who are passionate about improving healthcare through technology.
            </p>
            <Button
              href="/contact"
              variant="secondary"
              size="lg"
              className="bg-white text-primary-600 hover:bg-gray-100"
            >
              View Open Positions
            </Button>
          </AnimatedSection>
        </div>
      </section>
    </div>
  )
}
