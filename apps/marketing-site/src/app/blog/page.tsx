'use client'

import { Calendar, Clock, ArrowRight, Tag } from 'lucide-react'
import Button from '@/components/Button'
import AnimatedSection, { AnimatedCard } from '@/components/AnimatedSection'

const featuredPost = {
  slug: 'introducing-plaidhealth-api-v2',
  title: 'Introducing PlaidHealth API v2: Faster, More Reliable, More Data',
  excerpt: 'Today we\'re announcing the general availability of PlaidHealth API v2, featuring 50% faster response times, expanded data coverage, and new real-time sync capabilities.',
  date: '2024-01-15',
  readTime: '5 min read',
  category: 'Product',
  author: {
    name: 'Alex Chen',
    role: 'CEO',
  },
}

const posts = [
  {
    slug: 'hipaa-compliance-guide-developers',
    title: 'The Developer\'s Guide to HIPAA Compliance',
    excerpt: 'Building healthcare applications means understanding HIPAA. Here\'s what every developer needs to know about handling protected health information.',
    date: '2024-01-10',
    readTime: '8 min read',
    category: 'Engineering',
    author: {
      name: 'David Kim',
      role: 'VP of Compliance',
    },
  },
  {
    slug: 'fhir-r4-explained',
    title: 'FHIR R4 Explained: A Practical Introduction',
    excerpt: 'FHIR is the modern standard for healthcare data exchange. Learn what it is, why it matters, and how PlaidHealth uses it to normalize health data.',
    date: '2024-01-05',
    readTime: '10 min read',
    category: 'Engineering',
    author: {
      name: 'Sarah Martinez',
      role: 'CTO',
    },
  },
  {
    slug: 'patient-data-access-rights',
    title: 'Understanding Patient Data Access Rights Under 21st Century Cures',
    excerpt: 'The 21st Century Cures Act changed how patients can access their health data. Here\'s what healthcare developers need to know.',
    date: '2023-12-28',
    readTime: '6 min read',
    category: 'Industry',
    author: {
      name: 'Michael Thompson',
      role: 'Chief Medical Officer',
    },
  },
  {
    slug: 'building-medication-tracking-app',
    title: 'Tutorial: Building a Medication Tracking App with PlaidHealth',
    excerpt: 'A step-by-step guide to building a medication management application using the PlaidHealth API, from setup to deployment.',
    date: '2023-12-20',
    readTime: '15 min read',
    category: 'Tutorial',
    author: {
      name: 'Emily Park',
      role: 'VP of Engineering',
    },
  },
  {
    slug: 'state-of-healthcare-apis-2024',
    title: 'The State of Healthcare APIs in 2024',
    excerpt: 'We surveyed 500 healthcare developers about their experiences with health data APIs. Here\'s what we learned about the current landscape.',
    date: '2023-12-15',
    readTime: '7 min read',
    category: 'Industry',
    author: {
      name: 'Rachel Green',
      role: 'Head of Customer Success',
    },
  },
  {
    slug: 'epic-fhir-integration-lessons',
    title: 'Lessons from Integrating with Epic\'s FHIR APIs',
    excerpt: 'Epic is the largest EHR vendor in the US. Here\'s what we\'ve learned from building robust integrations with their FHIR APIs.',
    date: '2023-12-08',
    readTime: '9 min read',
    category: 'Engineering',
    author: {
      name: 'Sarah Martinez',
      role: 'CTO',
    },
  },
]

const categories = ['All', 'Product', 'Engineering', 'Industry', 'Tutorial']

export default function BlogPage() {
  return (
    <div className="pt-24">
      {/* Hero Section */}
      <section className="py-16 sm:py-20 gradient-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
              Blog
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Insights on healthcare APIs, interoperability, and building the future of digital health.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  category === 'All'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <article className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-2xl p-8 sm:p-12">
              <div className="flex items-center gap-4 mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                  <Tag className="w-3 h-3 mr-1" />
                  {featuredPost.category}
                </span>
                <span className="text-sm text-gray-500">Featured</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                {featuredPost.title}
              </h2>
              <p className="text-lg text-gray-600 mb-6 max-w-3xl">
                {featuredPost.excerpt}
              </p>
              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(featuredPost.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-2" />
                  {featuredPost.readTime}
                </div>
                <div className="text-sm text-gray-500">
                  By <span className="font-medium text-gray-700">{featuredPost.author.name}</span>, {featuredPost.author.role}
                </div>
              </div>
              <Button href={`/blog/${featuredPost.slug}`}>
                Read Article
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </article>
          </AnimatedSection>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, index) => (
              <AnimatedCard key={post.slug} delay={index * 0.1}>
                <article className="bg-white rounded-xl p-6 h-full flex flex-col border border-gray-200 hover:border-primary-300 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {post.category}
                    </span>
                    <span className="text-xs text-gray-500">{post.readTime}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex-grow">
                    <a href={`/blog/${post.slug}`} className="hover:text-primary-600 transition-colors">
                      {post.title}
                    </a>
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">{post.author.name}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(post.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </article>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Subscribe to our newsletter
            </h2>
            <p className="text-gray-600 mb-8">
              Get the latest insights on healthcare APIs, product updates, and industry news delivered to your inbox.
            </p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
              <Button type="submit">
                Subscribe
              </Button>
            </form>
            <p className="text-xs text-gray-500 mt-4">
              No spam. Unsubscribe anytime.
            </p>
          </AnimatedSection>
        </div>
      </section>
    </div>
  )
}
