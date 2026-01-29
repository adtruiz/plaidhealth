'use client'

import { motion } from 'framer-motion'
import {
  Shield,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Users,
  Activity,
  Stethoscope,
  ChevronRight,
  Code2,
} from 'lucide-react'
import Button from '@/components/Button'
import {
  DATA_CONNECTIONS,
  PLATFORM_FEATURES,
  INTEGRATION_STEPS,
  PRICING_TIERS,
  TRUSTED_BY,
} from '@/lib/constants'

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export default function Home() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center hero-gradient bg-hero-pattern">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-mint-200/30 rounded-full blur-3xl" />
        </div>

        <div className="relative container-custom pt-32 pb-20 lg:pt-40 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Content */}
            <motion.div
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="text-center lg:text-left"
            >
              <motion.div variants={fadeInUp}>
                <span className="badge badge-primary mb-6">
                  <Shield className="w-4 h-4 mr-2" aria-hidden="true" />
                  HIPAA Compliant & SOC 2 Certified
                </span>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-slate-900 tracking-tight leading-[1.1]"
              >
                The <span className="gradient-text">Plaid for Healthcare</span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="mt-6 text-lg sm:text-xl text-slate-600 max-w-xl mx-auto lg:mx-0"
              >
                One API to connect your application to patient health data from
                any EMR, payer, or lab system. Build compliant healthcare apps
                faster.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
              >
                <Button href="/contact" size="lg">
                  Get API Access
                  <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
                </Button>
                <Button href="/docs" variant="outline" size="lg">
                  View Documentation
                </Button>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="mt-12 flex items-center justify-center lg:justify-start gap-8"
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-900">50+</div>
                  <div className="text-sm text-slate-500">Integrations</div>
                </div>
                <div className="w-px h-12 bg-slate-200" aria-hidden="true" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-900">10M+</div>
                  <div className="text-sm text-slate-500">Patient Records</div>
                </div>
                <div className="w-px h-12 bg-slate-200" aria-hidden="true" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-900">99.99%</div>
                  <div className="text-sm text-slate-500">Uptime</div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right: Product Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              <div className="relative bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
                {/* Browser chrome */}
                <div className="flex items-center space-x-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
                  <div className="flex space-x-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-slate-700 rounded-md px-3 py-1 text-xs text-slate-400 flex items-center">
                      <Lock className="w-3 h-3 mr-2 text-mint-400" aria-hidden="true" />
                      api.plaidhealth.com/v1/patients
                    </div>
                  </div>
                </div>

                {/* Code content */}
                <div className="p-6">
                  <pre className="text-sm font-mono overflow-x-auto">
                    <code>
                      <span className="text-slate-500">
                        {'// Fetch patient medications'}
                      </span>
                      {'\n'}
                      <span className="text-purple-400">const</span>{' '}
                      <span className="text-slate-300">medications</span>{' '}
                      <span className="text-slate-500">=</span>{' '}
                      <span className="text-purple-400">await</span>{' '}
                      <span className="text-mint-400">plaidhealth</span>
                      <span className="text-slate-300">.medications.</span>
                      <span className="text-primary-400">list</span>
                      <span className="text-slate-300">({'{'}</span>
                      {'\n'}
                      <span className="text-slate-300">{'  '}</span>
                      <span className="text-mint-300">patient_id</span>
                      <span className="text-slate-300">:</span>{' '}
                      <span className="text-amber-300">
                        &apos;pt_abc123&apos;
                      </span>
                      <span className="text-slate-300">,</span>
                      {'\n'}
                      <span className="text-slate-300">{'}'});</span>
                      {'\n\n'}
                      <span className="text-slate-500">
                        {'// Returns normalized FHIR resources'}
                      </span>
                      {'\n'}
                      <span className="text-slate-300">{'{'}</span>
                      {'\n'}
                      <span className="text-slate-300">{'  '}</span>
                      <span className="text-mint-300">&quot;data&quot;</span>
                      <span className="text-slate-300">: [{'{'}</span>
                      {'\n'}
                      <span className="text-slate-300">{'    '}</span>
                      <span className="text-mint-300">
                        &quot;resourceType&quot;
                      </span>
                      <span className="text-slate-300">:</span>{' '}
                      <span className="text-amber-300">
                        &quot;MedicationStatement&quot;
                      </span>
                      <span className="text-slate-300">,</span>
                      {'\n'}
                      <span className="text-slate-300">{'    '}</span>
                      <span className="text-mint-300">&quot;status&quot;</span>
                      <span className="text-slate-300">:</span>{' '}
                      <span className="text-amber-300">&quot;active&quot;</span>
                      <span className="text-slate-300">,</span>
                      {'\n'}
                      <span className="text-slate-300">{'    '}</span>
                      <span className="text-mint-300">
                        &quot;medicationCodeableConcept&quot;
                      </span>
                      <span className="text-slate-300">: ...</span>
                      {'\n'}
                      <span className="text-slate-300">{'  }'}]</span>
                      {'\n'}
                      <span className="text-slate-300">{'}'}</span>
                    </code>
                  </pre>
                </div>
              </div>

              {/* Floating card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 border border-slate-100"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-mint-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2
                      className="w-5 h-5 text-mint-600"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      HIPAA Verified
                    </div>
                    <div className="text-xs text-slate-500">
                      End-to-end encrypted
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="container-custom">
          <p className="text-center text-sm font-medium text-slate-400 mb-8 uppercase tracking-wider">
            Trusted by innovative healthcare companies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
            {TRUSTED_BY.map((company, index) => (
              <motion.div
                key={company.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold">
                  {company.logo}
                </div>
                <span className="font-semibold">{company.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Connections Section */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge badge-mint mb-4">
              <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
              Universal Connectivity
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
              One API for all health data sources
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Connect to patient data across EMRs, payers, and labs with a
              single integration. No more building and maintaining dozens of
              separate connections.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {DATA_CONNECTIONS.map((connection, index) => (
              <motion.div
                key={connection.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="group relative bg-white rounded-2xl p-8 shadow-card hover:shadow-card-hover transition-all duration-300 border border-slate-100 hover:border-primary-200"
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${connection.color} flex items-center justify-center mb-6 shadow-lg`}
                >
                  <connection.icon
                    className="w-7 h-7 text-white"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {connection.name}
                </h3>
                <p className="text-slate-600">{connection.description}</p>
                <div className="mt-6 flex items-center text-primary-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                  Learn more{' '}
                  <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-padding bg-white">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge badge-primary mb-4">
              <Code2 className="w-4 h-4 mr-2" aria-hidden="true" />
              Platform Features
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
              Everything you need to build
              <br className="hidden sm:block" /> healthcare applications
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Stop wrestling with healthcare data complexity. Focus on building
              products that improve patient outcomes.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {PLATFORM_FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="group p-8 rounded-2xl bg-white border border-slate-200 hover:border-primary-200 transition-all duration-300 hover:shadow-lg"
              >
                <div className="feature-icon mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon
                    className="w-6 h-6 text-primary-600"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section-padding bg-slate-900 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />

        <div className="relative container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge bg-primary-500/10 text-primary-400 border-primary-500/20 mb-4">
              <Activity className="w-4 h-4 mr-2" aria-hidden="true" />
              Simple Integration
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Get started in three steps
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              From zero to production-ready healthcare data integration in
              record time
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {INTEGRATION_STEPS.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                {/* Connector line */}
                {index < INTEGRATION_STEPS.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-16 left-full w-full h-px bg-gradient-to-r from-primary-500/50 to-transparent z-0"
                    aria-hidden="true"
                  />
                )}

                <div className="relative bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 h-full hover:border-primary-500/50 transition-colors">
                  <div className="text-6xl font-black text-primary-500/20 mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <Button
              href="/docs"
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-100"
            >
              Read the Quickstart Guide
              <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="section-padding bg-white">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge badge-mint mb-4">
              <Users className="w-4 h-4 mr-2" aria-hidden="true" />
              Pricing Plans
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Start with a 14-day free trial. No credit card required. Scale as
              you grow.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {PRICING_TIERS.map((tier, index) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className={`relative rounded-2xl p-8 ${
                  tier.highlighted
                    ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl scale-105 border-2 border-primary-500'
                    : 'bg-white border border-slate-200 hover:border-primary-200'
                } transition-all duration-300`}
              >
                {tier.highlighted && (
                  <div className="popular-badge">Most Popular</div>
                )}

                <div className="mb-6">
                  <h3
                    className={`text-xl font-bold ${
                      tier.highlighted ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {tier.name}
                  </h3>
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
                    className={`text-4xl font-black ${
                      tier.highlighted ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {tier.price}
                  </span>
                  <span
                    className={
                      tier.highlighted ? 'text-slate-300' : 'text-slate-500'
                    }
                  >
                    {tier.period}
                  </span>
                </div>

                <ul className="space-y-3 mb-8">
                  {(tier.features as string[]).map((feature) => (
                    <li key={feature} className="flex items-start">
                      <CheckCircle2
                        className={`w-5 h-5 mr-3 flex-shrink-0 ${
                          tier.highlighted
                            ? 'text-primary-400'
                            : 'text-primary-600'
                        }`}
                        aria-hidden="true"
                      />
                      <span
                        className={
                          tier.highlighted ? 'text-slate-200' : 'text-slate-600'
                        }
                      >
                        {feature}
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
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-br from-primary-600 via-primary-500 to-mint-500 relative overflow-hidden">
        {/* Background pattern */}
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
              Ready to build with PlaidHealth?
            </h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-10">
              Join hundreds of developers building the next generation of
              healthcare applications. Get started with our free sandbox today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                href="/contact"
                size="lg"
                className="bg-white text-primary-600 hover:bg-slate-100 shadow-xl"
              >
                Get API Access
                <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
              </Button>
              <Button
                href="/docs"
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white/10"
              >
                View Documentation
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-white/60 text-sm">
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-2" aria-hidden="true" />
                HIPAA Compliant
              </div>
              <div className="flex items-center">
                <Lock className="w-4 h-4 mr-2" aria-hidden="true" />
                SOC 2 Type II
              </div>
              <div className="flex items-center">
                <Stethoscope className="w-4 h-4 mr-2" aria-hidden="true" />
                FHIR R4 Ready
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
