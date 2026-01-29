import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'PlaidHealth Developer Portal',
    template: '%s | PlaidHealth Portal',
  },
  description: 'Build healthcare integrations with the PlaidHealth API. Access documentation, manage API keys, and monitor usage.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://dashboard.plaidhealth.com',
    siteName: 'PlaidHealth Developer Portal',
    title: 'PlaidHealth Developer Portal',
    description: 'Build healthcare integrations with the PlaidHealth API. Access documentation, manage API keys, and monitor usage.',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
