'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { api } from './api'

export interface User {
  id: string
  email: string
  name: string
  company?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string, company?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = api.getToken()
      if (token) {
        const result = await api.getProfile()
        if (result.data) {
          setUser({
            id: result.data.id,
            email: result.data.email,
            name: result.data.name,
            company: result.data.company,
          })
        } else {
          // Token expired or invalid
          api.setToken(null)
        }
      }
      setIsLoading(false)
    }
    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)

    const result = await api.login(email, password)

    if (result.data) {
      api.setToken(result.data.token)
      setUser(result.data.user)
      setIsLoading(false)
      return { success: true }
    }

    setIsLoading(false)
    return { success: false, error: result.error || 'Login failed' }
  }

  const register = async (
    email: string,
    password: string,
    name: string,
    company?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)

    const result = await api.register(email, password, name, company)

    if (result.data) {
      api.setToken(result.data.token)
      setUser(result.data.user)
      setIsLoading(false)
      return { success: true }
    }

    setIsLoading(false)
    return { success: false, error: result.error || 'Registration failed' }
  }

  const logout = async () => {
    await api.logout()
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
