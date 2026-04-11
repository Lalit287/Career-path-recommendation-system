"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name: string
  email: string
  education: string
  skills: string[]
  interests: string[]
  savedCareers: string[]
  savedRoadmaps: string[]
  isAdmin: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  updateUser: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        }
      } catch {
        // Not authenticated
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setUser(data.user)
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch {
      return { success: false, error: "Network error" }
    }
  }, [])

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setUser(data.user)
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch {
      return { success: false, error: "Network error" }
    }
  }, [])

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    router.push("/login")
  }, [router])

  const updateUser = useCallback(async (data: Partial<User>) => {
    try {
      const res = await fetch("/api/auth/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (res.ok) {
        setUser(result.user)
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch {
      return { success: false, error: "Network error" }
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
