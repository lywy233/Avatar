import { ShieldCheckIcon } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'

function AuthRouteFallback({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-svh place-items-center bg-muted/20 p-4 sm:p-6">
      <Card className="w-full max-w-sm border shadow-none">
        <CardHeader className="items-center gap-3 border-b text-center">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-card text-foreground">
            <ShieldCheckIcon />
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-2 rounded-full bg-muted" />
        </CardContent>
      </Card>
    </div>
  )
}

export function ProtectedRoute() {
  const { authEnabled, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <AuthRouteFallback
        title="Checking your session"
        description="Avatar is restoring your authenticated workspace."
      />
    )
  }

  if (!authEnabled) {
    return <Outlet />
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        }}
      />
    )
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const { authEnabled, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <AuthRouteFallback
        title="Checking your session"
        description="Avatar is verifying whether you already have access."
      />
    )
  }

  if (!authEnabled) {
    return <Navigate to="/" replace />
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
