import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  api,
  clearSession,
  getAccessToken,
  getGuestToken,
  isSessionFresh,
  mergeGuestCartIfAny,
  setGuestToken,
  setSession,
  touchSession,
} from '../api/client'
import type { AuthResponse, GuestSessionResponse, UserResponse } from '../api/types'

interface AuthContextValue {
  user: UserResponse | null
  loading: boolean
  isGuest: boolean
  login: (email: string, password: string) => Promise<UserResponse>
  register: (email: string, password: string, fullName: string, phone: string) => Promise<UserResponse>
  continueAsGuest: () => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    async function bootstrap() {
      // The session survives being closed/reopened for SESSION_TTL_MS (the refresh-token
      // window). Beyond that the tokens are dropped and the user must log in again.
      if (getAccessToken() && isSessionFresh()) {
        try {
          const profile = await api.get<UserResponse>('/api/users/me')
          setUser(profile)
        } catch {
          clearSession()
        }
      } else if (getAccessToken()) {
        clearSession()
      } else if (getGuestToken()) {
        setIsGuest(true)
      }
      setLoading(false)
    }
    bootstrap()

    // Keep the session "touched" while the tab is open/active, and right as it closes,
    // so reopening within the TTL window auto-restores it.
    const touch = () => {
      if (getAccessToken()) touchSession()
    }
    window.addEventListener('beforeunload', touch)
    document.addEventListener('visibilitychange', touch)
    const interval = window.setInterval(touch, 20_000)
    return () => {
      window.removeEventListener('beforeunload', touch)
      document.removeEventListener('visibilitychange', touch)
      window.clearInterval(interval)
    }
  }, [])

  const applyAuthResponse = useCallback(async (response: AuthResponse) => {
    setSession(response.accessToken, response.refreshToken)
    await mergeGuestCartIfAny()
    setIsGuest(false)
    setUser(response.user)
    return response.user
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<AuthResponse>('/api/auth/login', { email, password })
      return applyAuthResponse(response)
    },
    [applyAuthResponse],
  )

  const register = useCallback(
    async (email: string, password: string, fullName: string, phone: string) => {
      const response = await api.post<AuthResponse>('/api/auth/register', {
        email,
        password,
        fullName,
        phone: phone || undefined,
      })
      return applyAuthResponse(response)
    },
    [applyAuthResponse],
  )

  const continueAsGuest = useCallback(async () => {
    const session = await api.postNoBody<GuestSessionResponse>('/api/auth/guest')
    setGuestToken(session.guestToken)
    setIsGuest(true)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.postNoBody('/api/auth/logout')
    } catch {
      // token may already be invalid; clear locally regardless
    }
    clearSession()
    setUser(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!getAccessToken()) return
    const profile = await api.get<UserResponse>('/api/users/me')
    setUser(profile)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, login, register, continueAsGuest, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
