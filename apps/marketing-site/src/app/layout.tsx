import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PlaidHealth - The Plaid for Healthcare API',
  description: 'One API to connect to all patient health data. Connect to Epic, Cerner, Humana, BCBS, and more. HIPAA compliant.',
  keywords: ['healthcare API', 'FHIR', 'health data', 'EMR integration', 'patient data', 'HIPAA'],
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
