'use client'

import {
  Smartphone,
  FlaskConical,
  GraduationCap,
  Stethoscope,
  Building,
  Heart,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'
import Button from '@/components/Button'
import AnimatedSection, { AnimatedCard, SlideIn } from '@/components/AnimatedSection'

const useCases = [
  {
    id: 'health-apps',
    icon: Smartphone,
    title: 'Healthcare App Developers',
    subtitle: 'Build patient-facing apps faster',
    description: 'Create compelling health apps without spending months on EMR integrations. Access patient data from Epic, Cerner, and more with a single API.',
    benefits: [
      'Launch your app in weeks, not months',
      'Connect to 50+ EMRs and payers',
      'Pre-built consent flows with Connect widget',
      'Normalized FHIR data for consistency',
    ],
    examples: [
      'Patient health record aggregators',
      'Medication management apps',
      'Chronic disease management platforms',
      'Health & wellness applications',
    ],
    color: 'primary',
  },
  {
    id: 'clinical-trials',
    icon: FlaskConical,
    title: 'Clinical Trial Platforms',
    subtitle: 'Streamline patient recruitment and monitoring',
    description: 'Access real-world patient data to accelerate clinical trials. Identify eligible patients, monitor outcomes, and ensure protocol compliance.',
    benefits: [
      'Faster patient recruitment with eligibility screening',
      'Real-time access to medical histories',
      'Automated adverse event monitoring',
      'Longitudinal health data collection',
    ],
    examples: [
      'eClinical trial platforms',
      'Patient recruitment tools',
      'Real-world evidence platforms',
      'Decentralized clinical trial software',
    ],
    color: 'accent',
  },
  {
    id: 'research',
    icon: GraduationCap,
    title: 'Healthcare Research',
    subtitle: 'Power research with real-world data',
    description: 'Access de-identified and consented patient data for research. Build cohorts, analyze trends, and generate insights from diverse patient populations.',
    benefits: [
      'Access to diverse patient populations',
      'Standardized FHIR data format',
      'Compliant data access with patient consent',
      'Longitudinal health records for studies',
    ],
    examples: [
      'Academic research institutions',
      'Population health studies',
      'Outcomes research platforms',
      'Health economics analysis',
    ],
    color: 'primary',
  },
  {
    id: 'telehealth',
    icon: Stethoscope,
    title: 'Telehealth Providers',
    subtitle: 'Deliver better virtual care',
    description: 'Give your clinicians instant access to patient history during virtual visits. Import medications, conditions, and labs to make informed decisions.',
    benefits: [
      'Complete patient context for visits',
      'Reduce time spent on manual data entry',
      'Improve care coordination',
      'Better clinical decision support',
    ],
    examples: [
      'Virtual primary care platforms',
      'Specialty telehealth services',
      'Mental health platforms',
      'Urgent care telehealth',
    ],
    color: 'accent',
  },
  {
    id: 'payers',
    icon: Building,
    title: 'Payers & Health Plans',
    subtitle: 'Close care gaps and improve outcomes',
    description: 'Access clinical data from provider networks to support care management programs, risk adjustment, and quality improvement initiatives.',
    benefits: [
      'Close care gaps with clinical data',
      'Improve risk adjustment accuracy',
      'Support value-based care programs',
      'Enable population health management',
    ],
    examples: [
      'Care management platforms',
      'Risk adjustment solutions',
      'Quality measure reporting',
      'Member engagement tools',
    ],
    color: 'primary',
  },
  {
    id: 'life-sciences',
    icon: Heart,
    title: 'Life Sciences',
    subtitle: 'Connect devices and therapeutics to health data',
    description: 'Build connected health products that integrate with the patient\'s broader health ecosystem. Combine device data with clinical context.',
    benefits: [
      'Contextualize device data with health records',
      'Enable personalized therapy adjustments',
      'Support companion diagnostic programs',
      'Power digital therapeutics with clinical data',
    ],
    examples: [
      'Digital therapeutics platforms',
      'Connected medical devices',
      'Companion diagnostic programs',
      'Precision medicine solutions',
    ],
    color: 'accent',
  },
]

export default function UseCasesPage() {
  return (
    <div className="pt-24">
      {/* Hero Section */}
      <section className="py-16 sm:py-20 gradient-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
              Built for healthcare innovators
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              From startups to enterprises, teams across healthcare use VerziHealth
              to build better products and improve patient outcomes.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Use Cases Grid */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {useCases.map((useCase, index) => (
              <div key={useCase.id} className={`${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <SlideIn direction={index % 2 === 0 ? 'left' : 'right'}>
                    <div>
                      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 ${
                        useCase.color === 'primary' ? 'bg-primary-100' : 'bg-accent-100'
                      }`}>
                        <useCase.icon className={`w-7 h-7 ${
                          useCase.color === 'primary' ? 'text-primary-600' : 'text-accent-600'
                        }`} />
                      </div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        {useCase.title}
                      </h2>
                      <p className={`text-lg font-medium mb-4 ${
                        useCase.color === 'primary' ? 'text-primary-600' : 'text-accent-600'
                      }`}>
                        {useCase.subtitle}
                      </p>
                      <p className="text-gray-600 mb-6">
                        {useCase.description}
                      </p>
                      <ul className="space-y-3 mb-8">
                        {useCase.benefits.map((benefit) => (
                          <li key={benefit} className="flex items-start">
                            <CheckCircle className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                              useCase.color === 'primary' ? 'text-primary-600' : 'text-accent-600'
                            }`} />
                            <span className="text-gray-700">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                      <Button href="/contact">
                        Learn More
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </SlideIn>

                  <SlideIn direction={index % 2 === 0 ? 'right' : 'left'} delay={0.2}>
                    <div className="bg-gray-50 rounded-2xl p-8">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                        Example Applications
                      </h3>
                      <ul className="space-y-4">
                        {useCase.examples.map((example) => (
                          <li key={example} className="flex items-center p-4 bg-white rounded-lg shadow-sm">
                            <div className={`w-2 h-2 rounded-full mr-3 ${
                              useCase.color === 'primary' ? 'bg-primary-500' : 'bg-accent-500'
                            }`} />
                            <span className="text-gray-700">{example}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </SlideIn>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="text-3xl font-bold text-white mb-4">
              Don&apos;t see your use case?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-8">
              We work with teams across the healthcare ecosystem.
              Get in touch to discuss how VerziHealth can support your specific needs.
            </p>
            <Button href="/contact" size="lg">
              Talk to Our Team
            </Button>
          </AnimatedSection>
        </div>
      </section>
    </div>
  )
}
