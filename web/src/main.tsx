import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import ChatPage from './pages/chat'
import Test1Page from './pages/test/test1'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/test/test1" element={<Test1Page />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
