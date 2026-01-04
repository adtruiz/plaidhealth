import { AuthProvider } from '@/lib/auth'
import { ProtectedRoute } from '@/components/protected-route'
import { DashboardLayout } from '@/components/dashboard-layout'

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <DashboardLayout>{children}</DashboardLayout>
      </ProtectedRoute>
    </AuthProvider>
  )
}
