'use client'

import { motion } from 'framer-motion'
import {
  Check,
  Minus,
  Shield,
  Zap,
  Users,
  HelpCircle,
  ArrowRight,
  Lock,
} from 'lucide-react'
import Button from '@/components/Button'
import {
  DETAILED_PRICING_TIERS,
  PRICING_FAQS,
  type PricingFeature,
} from '@/lib/constants'

const allPlansInclude = [
  { icon: Shield, text: 'HIPAA Compliant' },
  { icon: Lock, text: 'SOC 2 Type II' },
  { icon: Zap, text: 'End-to-end encryption' },
  { icon: Users, text: 'Sandbox environment' },
]

export default function PricingPage() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 hero-gradient bg-hero-pattern">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-mint-200/30 rounded-full blur-3xl" />
        </div>

        <div className="relative container-custom text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="badge badge-primary mb-6">
              <Users className="w-4 h-4 mr-2" aria-hidden="true" />
              Pricing Plans
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">
              Simple, transparent{' '}
              <span className="gradient-text">pricing</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
              Start with a 14-day free trial. No credit card required. Scale as
              you grow with plans designed for every stage.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {DETAILED_PRICING_TIERS.map((tier, index) => (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className={`relative rounded-2xl p-8 flex flex-col ${
                  tier.highlighted
                    ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl lg:scale-105 border-2 border-primary-500 z-10'
                    : 'bg-white border border-slate-200 hover:border-primary-200 hover:shadow-lg'
                } transition-all duration-300`}
              >
                {tier.highlighted && (
                  <div className="popular-badge">Most Popular</div>
                )}

                <div className="mb-6">
                  <h2
                    className={`text-2xl font-bold ${
                      tier.highlighted ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {tier.name}
                  </h2>
                  <p
                    className={`mt-2 text-sm ${
                      tier.highlighted ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {tier.description}
                  </p>
                </div>

                <div className="mb-6">
                  <span
                    className={`text-5xl font-black ${
                      tier.highlighted ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {tier.price}
                  </span>
                  <span
                    className={`text-lg ${
                      tier.highlighted ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {tier.period}
                  </span>
                </div>

                <ul className="space-y-4 flex-grow mb-8">
                  {(tier.features as PricingFeature[]).map((feature) => (
                    <li key={feature.name} className="flex items-start">
                      {feature.included ? (
                        <Check
                          className={`w-5 h-5 mr-3 flex-shrink-0 ${
                            tier.highlighted
                              ? 'text-primary-400'
                              : 'text-primary-600'
                          }`}
                          aria-hidden="true"
                        />
                      ) : (
                        <Minus
                          className={`w-5 h-5 mr-3 flex-shrink-0 ${
                            tier.highlighted ? 'text-slate-600' : 'text-slate-300'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={`text-sm ${
                          feature.included
                            ? tier.highlighted
                              ? 'text-slate-200'
                              : 'text-slate-700'
                            : tier.highlighted
                              ? 'text-slate-500'
                              : 'text-slate-400'
                        }`}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  href="/contact"
                  variant={tier.highlighted ? 'primary' : 'outline'}
                  size="lg"
                  className={`w-full justify-center ${
                    tier.highlighted
                      ? 'bg-white text-slate-900 hover:bg-slate-100'
                      : ''
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* All Plans Include */}
      <section className="py-12 bg-slate-50 border-y border-slate-100">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-sm font-medium text-slate-500 mb-6 uppercase tracking-wider">
              All plans include
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-12">
              {allPlansInclude.map((item, index) => (
                <div key={index} className="flex items-center text-slate-600">
                  <item.icon
                    className="w-5 h-5 mr-2 text-primary-600"
                    aria-hidden="true"
                  />
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge badge-mint mb-4">
              <HelpCircle className="w-4 h-4 mr-2" aria-hidden="true" />
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Everything you need to know about our pricing and plans.
            </p>
          </motion.div>

          <div className="space-y-6">
            {PRICING_FAQS.map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-50 rounded-2xl p-6 hover:bg-slate-100 transition-colors"
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  {faq.question}
                </h3>
                <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-br from-primary-600 via-primary-500 to-mint-500 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-hero-pattern opacity-10"
          aria-hidden="true"
        />
        <div
          className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"
          aria-hidden="true"
        />

        <div className="relative container-custom text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
              Ready to get started?
            </h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-10">
              Start your 14-day free trial today. No credit card required. Get
              access to all features and start building immediately.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                href="/contact"
                size="lg"
                className="bg-white text-primary-600 hover:bg-slate-100 shadow-xl"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
              </Button>
              <Button
                href="/contact"
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white/10"
              >
                Talk to Sales
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
