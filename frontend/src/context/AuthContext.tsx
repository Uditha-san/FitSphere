import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { AuthContextType, LoginCredentials, User, UserRole } from '../types/auth'
import { authApiService } from '../services/authApi'

const TOKEN_KEY = 'fitsphere_auth_token'
const USER_KEY = 'fitsphere_auth_user'

const DEV_CREDENTIALS: Record<UserRole, LoginCredentials> = {
  super_admin: {
    email: 'superadmin@fitsphere.io',
    password: 'SuperAdmin123!',
  },
  gym_admin: {
    email: 'gymadmin@fitsphere.io',
    password: 'GymAdmin123!',
  },
  coach: {
    email: 'coach.mike@fitsphere.io',
    password: 'Coach123!',
  },
  client: {
    email: 'client.alex@fitsphere.io',
    password: 'Client123!',
  },
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return null
      }
    }
    return null
  })

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY) || null
  })

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setError(null)
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authApiService.login(credentials)
      setToken(response.access_token)
      setUser(response.user)
      localStorage.setItem(TOKEN_KEY, response.access_token)
      localStorage.setItem(USER_KEY, JSON.stringify(response.user))
    } catch (err: any) {
      const msg = err.message || 'Login failed'
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const switchDevUser = useCallback(
    async (role: UserRole) => {
      const creds = DEV_CREDENTIALS[role]
      if (creds) {
        await login(creds)
      }
    },
    [login]
  )

  // Verify token on mount if present
  useEffect(() => {
    const verifySavedSession = async () => {
      if (!token) return
      try {
        const freshUser = await authApiService.getMe(token)
        setUser(freshUser)
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser))
      } catch (err) {
        console.warn('Stored session invalid or expired, logging out.', err)
        logout()
      }
    }

    verifySavedSession()
  }, [])

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    error,
    login,
    logout,
    switchDevUser,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
