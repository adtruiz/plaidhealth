import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'PlaidHealth - The Plaid for Healthcare API',
    template: '%s | PlaidHealth',
  },
  description: 'One API to connect to all patient health data. Connect to Epic, Cerner, Humana, BCBS, and more. HIPAA compliant.',
  keywords: ['healthcare API', 'FHIR', 'health data', 'EMR integration', 'patient data', 'HIPAA'],
  authors: [{ name: 'PlaidHealth' }],
  creator: 'PlaidHealth',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://plaidhealth.com',
    siteName: 'PlaidHealth',
    title: 'PlaidHealth - The Plaid for Healthcare API',
    description: 'One unified API to connect your app to patient health data from any EMR, payer, or lab system. HIPAA compliant.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PlaidHealth - Healthcare Data API',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PlaidHealth - The Plaid for Healthcare API',
    description: 'One unified API to connect your app to patient health data from any EMR, payer, or lab system.',
    images: ['/og-image.png'],
    creator: '@plaidhealth',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
