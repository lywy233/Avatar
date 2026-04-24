import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ProtectedRoute, PublicOnlyRoute } from './components/auth-routes'
import ChatPage from './pages/chat'
import ChatTestPage from './pages/chat-test'
import { AuthProvider } from './hooks/use-auth'
import FileSystemPage from './pages/file-system'
import LoginPage from './pages/login'
import ModelProviderPage from './pages/model-provider'
import SettingsPage from './pages/settings'
import SkillsHubPage from './pages/skills-hub'
import Test1Page from './pages/test/test1'
import { ErrorHandlerProvider } from './hooks/use-error-handler'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorHandlerProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<App />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/ChatTest" element={<ChatTestPage />} />
              <Route path="/file-system" element={<FileSystemPage />} />
              <Route path="/model-provider" element={<ModelProviderPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/skills-hub" element={<SkillsHubPage />} />
              <Route path="/test/test1" element={<Test1Page />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorHandlerProvider>
  </StrictMode>,
)
