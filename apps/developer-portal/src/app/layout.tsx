import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'VerziHealth Developer Portal',
    template: '%s | VerziHealth Portal',
  },
  description: 'Build healthcare integrations with the VerziHealth API. Access documentation, manage API keys, and monitor usage.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://dashboard.verzihealth.com',
    siteName: 'VerziHealth Developer Portal',
    title: 'VerziHealth Developer Portal',
    description: 'Build healthcare integrations with the VerziHealth API. Access documentation, manage API keys, and monitor usage.',
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
