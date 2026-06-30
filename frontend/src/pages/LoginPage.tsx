import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/api/endpoints/auth'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!username || !password) {
      setError('Username and Password are required.')
      return
    }

    setIsLoading(true)
    try {
      const response = await authApi.login({ username, password })
      login(response.data.data.token, response.data.data.user)
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred during login.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-neutral)]">
      {/* Left Panel - Hidden on Mobile */}
      <div className="hidden w-1/2 flex-col justify-between bg-[var(--color-primary)] p-12 text-white lg:flex relative overflow-hidden">
        {/* Accent background element */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--color-tertiary)] rounded-full blur-[120px] opacity-20 translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight font-[var(--font-display)]">
            Heritage<span className="text-[var(--color-tertiary)]">.</span>
          </h1>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-medium leading-tight text-white mb-6 font-[var(--font-display)]">
            Logistics View <br/> Management System
          </h2>
          <p className="text-white/60 text-lg max-w-md font-[var(--font-body)]">
            Integrated platform for shipment tracking, customer management, and real-time order monitoring.
          </p>
        </div>
        <div className="relative z-10 text-sm text-white/40">
          © {new Date().getFullYear()} Heritage Logistics. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2 animate-fadeIn">
        <div className="w-full max-w-md space-y-8 bg-[var(--color-surface)] p-8 sm:p-10 rounded-[var(--radius-lg)] shadow-xl lg:shadow-none lg:bg-transparent">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-primary)] font-[var(--font-display)]">Welcome back</h2>
            <p className="mt-2 text-sm text-[var(--color-secondary)]">
              Enter your credentials to access the system
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-primary)]">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                  placeholder="Enter your username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-primary)]">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-[var(--radius-md)] bg-red-50 border border-red-200 p-3">
                <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}