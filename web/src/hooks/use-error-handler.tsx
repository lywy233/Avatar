import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ErrorState {
  isOpen: boolean
  title: string
  message: string
}

interface ErrorContextValue {
  showError: (title: string, message: string) => void
}

const ErrorContext = createContext<ErrorContextValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useErrorHandler() {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useErrorHandler must be used within an ErrorHandlerProvider')
  }
  return context
}

interface Props {
  children: ReactNode
}

export function ErrorHandlerProvider({ children }: Props) {
  const [error, setError] = useState<ErrorState>({
    isOpen: false,
    title: 'Error',
    message: '',
  })

  const showError = useCallback((title: string, message: string) => {
    setError({ isOpen: true, title, message })
  }, [])

  const handleClose = useCallback(() => {
    setError((prev) => ({ ...prev, isOpen: false }))
  }, [])

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      const message = error instanceof Error ? error.message : String(error)
      if (message && !message.includes('AbortError') && !message.includes('aborted')) {
        showError('Unexpected Error', message)
      }
    }

    const handleGlobalError = (event: ErrorEvent) => {
      const message = event.message
      if (message && !message.includes('ResizeObserver') && !message.includes('Warning')) {
        showError('Unexpected Error', message)
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleGlobalError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleGlobalError)
    }
  }, [showError])

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      <AlertDialog open={error.isOpen} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{error.title}</AlertDialogTitle>
            <AlertDialogDescription>{error.message}</AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </ErrorContext.Provider>
  )
}
