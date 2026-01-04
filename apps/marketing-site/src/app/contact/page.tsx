'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react'
import Button from '@/components/Button'
import AnimatedSection from '@/components/AnimatedSection'

const contactMethods = [
  {
    icon: Mail,
    title: 'Email Us',
    description: 'For general inquiries',
    value: 'hello@plaidhealth.com',
    href: 'mailto:hello@plaidhealth.com',
  },
  {
    icon: Phone,
    title: 'Sales',
    description: 'For pricing & demos',
    value: 'sales@plaidhealth.com',
    href: 'mailto:sales@plaidhealth.com',
  },
  {
    icon: MapPin,
    title: 'Location',
    description: 'San Francisco, CA',
    value: 'View on map',
    href: '#',
  },
]

const inquiryTypes = [
  'Request a demo',
  'Pricing inquiry',
  'Technical question',
  'Partnership opportunity',
  'Other',
]

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsLoading(false)
    setIsSubmitted(true)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="pt-24">
      {/* Hero Section */}
      <section className="py-16 sm:py-20 gradient-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
              Get in touch
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Ready to transform how you access patient health data?
              Our team is here to help you get started.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {contactMethods.map((method) => (
              <AnimatedSection key={method.title}>
                <a
                  href={method.href}
                  className="flex items-start p-6 rounded-xl bg-white border border-gray-200 hover:border-primary-300 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center mr-4 flex-shrink-0">
                    <method.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{method.title}</h3>
                    <p className="text-sm text-gray-500">{method.description}</p>
                    <p className="text-primary-600 font-medium mt-1">{method.value}</p>
                  </div>
                </a>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-12">
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Thank you for reaching out!
                  </h2>
                  <p className="text-gray-600 mb-8">
                    We&apos;ve received your message and will get back to you within 24 hours.
                  </p>
                  <Button onClick={() => setIsSubmitted(false)} variant="outline">
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Request a Demo
                    </h2>
                    <p className="text-gray-600 mt-2">
                      Fill out the form below and we&apos;ll be in touch shortly.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium text-gray-700 mb-2"
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
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                          placeholder="John Smith"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-gray-700 mb-2"
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
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                          placeholder="john@company.com"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="company"
                          className="block text-sm font-medium text-gray-700 mb-2"
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
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                          placeholder="Acme Health"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="inquiryType"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Inquiry Type *
                        </label>
                        <select
                          id="inquiryType"
                          name="inquiryType"
                          required
                          value={formState.inquiryType}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors bg-white"
                        >
                          <option value="">Select an option</option>
                          {inquiryTypes.map((type) => (
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
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Message *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        rows={4}
                        value={formState.message}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors resize-none"
                        placeholder="Tell us about your project and what you're looking to build..."
                      />
                    </div>

                    <div>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full"
                        size="lg"
                      >
                        {isLoading ? (
                          'Sending...'
                        ) : (
                          <>
                            Send Message
                            <Send className="ml-2 w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      By submitting this form, you agree to our{' '}
                      <a href="/privacy" className="text-primary-600 hover:underline">
                        Privacy Policy
                      </a>{' '}
                      and{' '}
                      <a href="/terms" className="text-primary-600 hover:underline">
                        Terms of Service
                      </a>
                      .
                    </p>
                  </form>
                </>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* FAQ CTA */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Have questions about pricing?
            </h2>
            <p className="text-gray-600 mb-6">
              Check out our pricing page for detailed plan comparisons and FAQs.
            </p>
            <Button href="/pricing" variant="outline">
              View Pricing
            </Button>
          </AnimatedSection>
        </div>
      </section>
    </div>
  )
}
