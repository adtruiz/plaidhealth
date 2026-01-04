'use client'

import { Check, Minus } from 'lucide-react'
import Button from '@/components/Button'
import AnimatedSection, { AnimatedCard } from '@/components/AnimatedSection'

const tiers = [
  {
    name: 'Starter',
    id: 'starter',
    price: '$299',
    period: '/month',
    description: 'For early-stage startups and MVPs.',
    features: [
      { name: 'Up to 100 connected patients', included: true },
      { name: '10,000 API calls/month', included: true },
      { name: 'Standard support (48h response)', included: true },
      { name: '5 EMR integrations', included: true },
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
    description: 'For growing companies with production apps.',
    features: [
      { name: 'Up to 1,000 connected patients', included: true },
      { name: '100,000 API calls/month', included: true },
      { name: 'Priority support (24h response)', included: true },
      { name: 'All 50+ integrations', included: true },
      { name: 'Advanced analytics & insights', included: true },
      { name: 'Sandbox + Production environments', included: true },
      { name: 'Webhooks', included: true },
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
    description: 'For large organizations with complex needs.',
    features: [
      { name: 'Unlimited connected patients', included: true },
      { name: 'Unlimited API calls', included: true },
      { name: 'Dedicated support (4h response)', included: true },
      { name: 'All 50+ integrations', included: true },
      { name: 'Custom analytics & reporting', included: true },
      { name: 'Dedicated environments', included: true },
      { name: 'Webhooks', included: true },
      { name: 'Custom data mappings', included: true },
      { name: 'Dedicated CSM & solutions engineer', included: true },
      { name: '99.99% uptime SLA', included: true },
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

const faqs = [
  {
    question: 'What counts as a connected patient?',
    answer: 'A connected patient is any unique patient who has authorized access to their health data through our Connect widget. Once connected, they remain counted for the duration of their active connection.',
  },
  {
    question: 'Can I switch plans anytime?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. When upgrading, you\'ll have immediate access to additional features. When downgrading, the change takes effect at your next billing cycle.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! We offer a 14-day free trial on both Starter and Growth plans with full access to all features. No credit card required to start.',
  },
  {
    question: 'What EMR and payer integrations are included?',
    answer: 'All plans include access to major EMRs (Epic, Cerner, Allscripts, etc.) and payers (BCBS, Humana, Aetna, etc.). The Starter plan includes 5 integrations of your choice, while Growth and Enterprise include all 50+.',
  },
  {
    question: 'Do you offer HIPAA BAA?',
    answer: 'Yes, we provide Business Associate Agreements (BAA) for all paid plans. Our platform is fully HIPAA compliant and SOC 2 Type II certified.',
  },
  {
    question: 'What happens if I exceed my API limit?',
    answer: 'We\'ll notify you when you reach 80% of your limit. If you exceed it, you can either upgrade your plan or purchase additional API calls at $0.01 per call.',
  },
]

export default function PricingPage() {
  return (
    <div className="pt-24">
      {/* Hero Section */}
      <section className="py-16 sm:py-20 gradient-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Start building for free. Scale as you grow. Only pay for what you use.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-6">
            {tiers.map((tier, index) => (
              <AnimatedCard key={tier.id} delay={index * 0.1}>
                <div
                  className={`rounded-2xl p-8 h-full flex flex-col ${
                    tier.highlighted
                      ? 'bg-gray-900 text-white ring-2 ring-primary-500'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  {tier.highlighted && (
                    <span className="inline-flex self-start items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-500 text-white mb-4">
                      Most Popular
                    </span>
                  )}
                  <h2 className={`text-2xl font-bold ${tier.highlighted ? 'text-white' : 'text-gray-900'}`}>
                    {tier.name}
                  </h2>
                  <p className={`mt-2 text-sm ${tier.highlighted ? 'text-gray-300' : 'text-gray-600'}`}>
                    {tier.description}
                  </p>
                  <div className="mt-6">
                    <span className={`text-4xl font-bold ${tier.highlighted ? 'text-white' : 'text-gray-900'}`}>
                      {tier.price}
                    </span>
                    <span className={tier.highlighted ? 'text-gray-300' : 'text-gray-600'}>
                      {tier.period}
                    </span>
                  </div>
                  <ul className="mt-8 space-y-4 flex-grow">
                    {tier.features.map((feature) => (
                      <li key={feature.name} className="flex items-start">
                        {feature.included ? (
                          <Check className={`w-5 h-5 mr-3 flex-shrink-0 ${tier.highlighted ? 'text-primary-400' : 'text-primary-600'}`} />
                        ) : (
                          <Minus className={`w-5 h-5 mr-3 flex-shrink-0 ${tier.highlighted ? 'text-gray-600' : 'text-gray-300'}`} />
                        )}
                        <span className={`text-sm ${
                          feature.included
                            ? tier.highlighted ? 'text-gray-200' : 'text-gray-700'
                            : tier.highlighted ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Button
                      href="/contact"
                      variant={tier.highlighted ? 'primary' : 'outline'}
                      className={`w-full ${tier.highlighted ? 'bg-white text-gray-900 hover:bg-gray-100' : ''}`}
                    >
                      {tier.cta}
                    </Button>
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Note */}
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center">
              <p className="text-gray-600">
                All plans include: HIPAA BAA, SOC 2 compliance, data encryption, and access to our sandbox environment.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Frequently asked questions
            </h2>
          </AnimatedSection>

          <div className="space-y-8">
            {faqs.map((faq, index) => (
              <AnimatedSection key={faq.question} delay={index * 0.05}>
                <div className="border-b border-gray-200 pb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-gray-600">
                    {faq.answer}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to get started?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-8">
              Start your 14-day free trial today. No credit card required.
            </p>
            <Button href="/contact" size="lg">
              Start Free Trial
            </Button>
          </AnimatedSection>
        </div>
      </section>
    </div>
  )
}
