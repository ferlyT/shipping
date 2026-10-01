import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles/globals.css'
import './styles/animations.css'
import { AppRouter } from './app/router'

// Auto reload when chunk hash fails due to newly deployed build
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  window.location.reload()
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 2, // 2 minutes stale cache to prevent redundant fetches
      gcTime: 1000 * 60 * 15,    // 15 minutes garbage collection
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  </StrictMode>,
)
