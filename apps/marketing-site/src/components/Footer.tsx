import Link from 'next/link'
import { Shield, Lock, Github, Twitter, Linkedin } from 'lucide-react'
import { FOOTER_NAVIGATION, SOCIAL_LINKS } from '@/lib/constants'

const socialIcons = {
  GitHub: Github,
  Twitter: Twitter,
  LinkedIn: Linkedin,
} as const

export default function Footer() {
  return (
    <footer className="bg-slate-900" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-8 lg:pt-24">
        <div className="xl:grid xl:grid-cols-3 xl:gap-12">
          {/* Brand section */}
          <div className="space-y-6 xl:col-span-1">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-mint-500 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-white">
                Verzi<span className="text-primary-400">Health</span>
              </span>
            </Link>

            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              The VerziHealth. One unified API to connect to patient
              health data from EMRs, payers, and labs.
            </p>

            {/* Compliance badges */}
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/20">
                <Shield className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                HIPAA Compliant
              </div>
              <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-mint-500/10 text-mint-400 border border-mint-500/20">
                <Lock className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                SOC 2 Type II
              </div>
            </div>

            {/* Social links */}
            <div className="flex space-x-4">
              {SOCIAL_LINKS.map((item) => {
                const Icon = socialIcons[item.name as keyof typeof socialIcons]
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-slate-500 hover:text-primary-400 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit our ${item.name} page`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Navigation links */}
          <div className="mt-12 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Product
                </h3>
                <ul role="list" className="mt-4 space-y-3">
                  {FOOTER_NAVIGATION.product.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm text-slate-400 hover:text-primary-400 transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Developers
                </h3>
                <ul role="list" className="mt-4 space-y-3">
                  {FOOTER_NAVIGATION.developers.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm text-slate-400 hover:text-primary-400 transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Company
                </h3>
                <ul role="list" className="mt-4 space-y-3">
                  {FOOTER_NAVIGATION.company.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm text-slate-400 hover:text-primary-400 transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Legal
                </h3>
                <ul role="list" className="mt-4 space-y-3">
                  {FOOTER_NAVIGATION.legal.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm text-slate-400 hover:text-primary-400 transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} VerziHealth, Inc. All rights
              reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <Link
                href="/privacy"
                className="hover:text-primary-400 transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="hover:text-primary-400 transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/security"
                className="hover:text-primary-400 transition-colors"
              >
                Security
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
