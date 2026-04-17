import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import ChatPage from './pages/chat'
import ChatTestPage from './pages/chat-test'
import Test1Page from './pages/test/test1'
import { ErrorHandlerProvider } from './hooks/use-error-handler'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorHandlerProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/ChatTest" element={<ChatTestPage />} />
          <Route path="/test/test1" element={<Test1Page />} />
        </Routes>
      </BrowserRouter>
    </ErrorHandlerProvider>
  </StrictMode>,
)
