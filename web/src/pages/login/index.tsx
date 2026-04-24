import { BotIcon, LogInIcon, ShieldCheckIcon } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { useErrorHandler } from '@/hooks/use-error-handler'

type LoginLocationState = {
  from?: {
    pathname?: string
    search?: string
    hash?: string
  }
}

function resolveRedirectPath(state: unknown): string {
  if (!state || typeof state !== 'object') {
    return '/'
  }

  const redirectState = state as LoginLocationState
  const pathname = redirectState.from?.pathname?.trim()

  if (!pathname) {
    return '/'
  }

  return `${pathname}${redirectState.from?.search ?? ''}${redirectState.from?.hash ?? ''}`
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { authEnabled, login } = useAuth()
  const { showError } = useErrorHandler()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const redirectPath = useMemo(() => resolveRedirectPath(location.state), [location.state])
  const canSubmit = username.trim().length >= 3 && password.length >= 8 && !isSubmitting

  if (!authEnabled) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      await login({ username, password })
      navigate(redirectPath, { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in right now.'
      setFormError(message)
      showError('Sign in failed', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-svh place-items-center bg-muted/20 p-4 sm:p-6">
      <Card className="w-full max-w-md border shadow-none">
        <CardHeader className="gap-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border bg-card text-foreground">
              <BotIcon />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Avatar</p>
              <p className="truncate text-xs text-muted-foreground">Protected frontend workspace</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge>Login</Badge>
            <Badge variant="outline">/login</Badge>
          </div>

          <div className="flex flex-col gap-2">
            <CardTitle className="text-3xl font-semibold tracking-tight text-balance">
              Sign in to continue.
            </CardTitle>
            <CardDescription className="text-sm leading-6 md:text-base">
              All existing app routes now sit behind the authenticated shell. Use an existing
              username and password to enter the workspace.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 pt-6">
          <div className="flex items-start gap-3 rounded-lg border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
            <ShieldCheckIcon className="mt-0.5 shrink-0" />
            <p>
              After signing in, Avatar restores the protected shell and sends your stored bearer
              token with the frontend&apos;s existing API requests.
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="username">
                Username
              </label>
              <Input
                id="username"
                autoComplete="username"
                disabled={isSubmitting}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                disabled={isSubmitting}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <Button disabled={!canSubmit} type="submit">
              <LogInIcon data-icon="inline-start" />
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
