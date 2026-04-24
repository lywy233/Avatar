import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  authUnauthorizedEvent,
  clearStoredAccessToken,
  fetchAuthStatus,
  fetchAuthenticatedUser,
  isAuthEnabled,
  persistAccessToken,
  readStoredAccessToken,
  requestAccessToken,
  setAuthEnabled,
  type AuthenticatedUser,
} from '@/lib/auth-api'

type LoginPayload = {
  username: string
  password: string
}

type AuthContextValue = {
  authEnabled: boolean
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<AuthenticatedUser>
  logout: () => void
  refreshUser: (signal?: AbortSignal) => Promise<AuthenticatedUser | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [authEnabled, setAuthEnabledState] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  const handleSignedOut = useCallback(() => {
    clearStoredAccessToken()
    setUser(null)
    setIsLoading(false)
  }, [])

  const refreshUser = useCallback(
    async (signal?: AbortSignal) => {
      if (!authEnabled) {
        clearStoredAccessToken()
        setUser(null)
        setIsLoading(false)
        return null
      }

      if (!readStoredAccessToken()) {
        handleSignedOut()
        return null
      }

      try {
        const nextUser = await fetchAuthenticatedUser(signal)
        setUser(nextUser)
        return nextUser
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error
        }

        handleSignedOut()
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [authEnabled, handleSignedOut],
  )

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      try {
        const status = await fetchAuthStatus(controller.signal)
        setAuthEnabledState(status.enabled)

        if (!status.enabled) {
          clearStoredAccessToken()
          setUser(null)
          setIsLoading(false)
          return
        }

        await refreshUser(controller.signal)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setAuthEnabled(true)
        setAuthEnabledState(true)
        handleSignedOut()
      }
    })()

    return () => controller.abort()
  }, [handleSignedOut, refreshUser])

  useEffect(() => {
    const handleUnauthorized = () => {
      handleSignedOut()
    }

    window.addEventListener(authUnauthorizedEvent, handleUnauthorized)
    return () => window.removeEventListener(authUnauthorizedEvent, handleUnauthorized)
  }, [handleSignedOut])

  const login = useCallback(async ({ username, password }: LoginPayload) => {
    if (!authEnabled || !isAuthEnabled()) {
      throw new Error('Authentication is disabled.')
    }

    const accessToken = await requestAccessToken(username.trim(), password)
    const nextUser = await fetchAuthenticatedUser(undefined, accessToken)
    persistAccessToken(accessToken)
    setUser(nextUser)
    setIsLoading(false)
    return nextUser
  }, [authEnabled])

  const logout = useCallback(() => {
    handleSignedOut()
  }, [handleSignedOut])

  const value = useMemo<AuthContextValue>(
    () => ({
      authEnabled,
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [authEnabled, user, isLoading, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
