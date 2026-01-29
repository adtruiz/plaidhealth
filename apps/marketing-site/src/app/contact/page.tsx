'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Mail,
  MessageSquare,
  MapPin,
  Send,
  CheckCircle2,
  ArrowRight,
  Building2,
} from 'lucide-react'
import Button from '@/components/Button'
import { CONTACT_METHODS, INQUIRY_TYPES } from '@/lib/constants'

const contactIcons = {
  'Email Us': Mail,
  Sales: MessageSquare,
  Headquarters: MapPin,
} as const

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    inquiryType: '',
    message: '',
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsLoading(true)
      setError(null)

      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
        const response = await fetch(`${apiUrl}/api/v1/contact`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formState),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to submit form')
        }

        setIsSubmitted(true)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.'
        )
      } finally {
        setIsLoading(false)
      }
    },
    [formState]
  )

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value } = e.target
      setFormState((prev) => ({
        ...prev,
        [name]: value,
      }))
    },
    []
  )

  const resetForm = useCallback(() => {
    setIsSubmitted(false)
    setFormState({
      name: '',
      email: '',
      company: '',
      inquiryType: '',
      message: '',
    })
  }, [])

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-20 hero-gradient bg-hero-pattern">
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
              <Building2 className="w-4 h-4 mr-2" aria-hidden="true" />
              Contact Us
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">
              Get in <span className="gradient-text">touch</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
              Ready to transform how you access patient health data? Our team is
              here to help you get started.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 border-b border-slate-100 bg-white">
        <div className="container-custom">
          <div className="grid md:grid-cols-3 gap-6">
            {CONTACT_METHODS.map((method, index) => {
              const Icon =
                contactIcons[method.title as keyof typeof contactIcons]
              return (
                <motion.a
                  key={method.title}
                  href={method.href}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group flex items-start p-6 rounded-2xl bg-white border border-slate-200 hover:border-primary-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-mint-100 flex items-center justify-center mr-4 flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Icon
                      className="w-6 h-6 text-primary-600"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {method.title}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {method.description}
                    </p>
                    <p className="text-primary-600 font-medium mt-1 group-hover:translate-x-1 transition-transform inline-flex items-center">
                      {method.value}
                    </p>
                  </div>
                </motion.a>
              )
            })}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:p-12"
          >
            {isSubmitted ? (
              <div className="text-center py-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-mint-100 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle2
                    className="w-10 h-10 text-mint-600"
                    aria-hidden="true"
                  />
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">
                  Thank you for reaching out!
                </h2>
                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                  We&apos;ve received your message and will get back to you
                  within 24 hours.
                </p>
                <Button onClick={resetForm} variant="outline">
                  Send Another Message
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center mb-10">
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    Request a Demo
                  </h2>
                  <p className="text-slate-600 mt-3">
                    Fill out the form below and our team will reach out within
                    one business day.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
                      role="alert"
                    >
                      {error}
                    </motion.div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-slate-700 mb-2"
                      >
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formState.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-slate-700 mb-2"
                      >
                        Work Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formState.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white"
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="company"
                        className="block text-sm font-medium text-slate-700 mb-2"
                      >
                        Company *
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        required
                        value={formState.company}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white"
                        placeholder="Acme Health"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="inquiryType"
                        className="block text-sm font-medium text-slate-700 mb-2"
                      >
                        Inquiry Type *
                      </label>
                      <select
                        id="inquiryType"
                        name="inquiryType"
                        required
                        value={formState.inquiryType}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white"
                      >
                        <option value="">Select an option</option>
                        {INQUIRY_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-slate-700 mb-2"
                    >
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      value={formState.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white resize-none"
                      placeholder="Tell us about your project and what you're looking to build..."
                    />
                  </div>

                  <div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full justify-center"
                      size="lg"
                    >
                      {isLoading ? (
                        <span className="flex items-center">
                          <LoadingSpinner />
                          Sending...
                        </span>
                      ) : (
                        <>
                          Send Message
                          <Send className="ml-2 w-5 h-5" aria-hidden="true" />
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-slate-500 text-center">
                    By submitting this form, you agree to our{' '}
                    <a
                      href="/privacy"
                      className="text-primary-600 hover:underline font-medium"
                    >
                      Privacy Policy
                    </a>{' '}
                    and{' '}
                    <a
                      href="/terms"
                      className="text-primary-600 hover:underline font-medium"
                    >
                      Terms of Service
                    </a>
                    .
                  </p>
                </form>
              </>
            )}
          </motion.div>
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
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-6">
              Questions about pricing?
            </h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-10">
              Check out our pricing page for detailed plan comparisons and
              frequently asked questions.
            </p>
            <Button
              href="/pricing"
              size="lg"
              className="bg-white text-primary-600 hover:bg-slate-100 shadow-xl"
            >
              View Pricing Plans
              <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
