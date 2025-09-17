import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { CityProvider } from './contexts/CityContext'
import { ToastProvider } from './contexts/ToastContext'
import { ToastViewport } from './components/Toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <CityProvider>
            <App />
            <ToastViewport />
          </CityProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
