import { useState } from 'react'

import { authApi } from '@/api/endpoints/auth'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!username || !fullName || !password || !confirmPassword) {
      setError('Semua field wajib diisi.')
      return
    }

    if (password !== confirmPassword) {
      setError('Password dan Konfirmasi Password tidak cocok.')
      return
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }

    setIsLoading(true)
    try {
      const response = await authApi.register({ username, fullName, password })
      setSuccess(response.data?.message || 'Pendaftaran berhasil. Silakan tunggu persetujuan Admin.')
      // Optional: Clear form
      setUsername('')
      setFullName('')
      setPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Terjadi kesalahan saat pendaftaran.')
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
          <h1 className="font-[var(--font-display)] font-medium text-[40px] m-0 mb-1 tracking-[-0.02em] text-[var(--color-primary)]">
            mshipping<span className="text-[var(--color-tertiary)]">.</span>
          </h1>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-medium leading-tight text-white mb-6 font-[var(--font-display)]">
            mshipping
          </h2>
          <p className="text-white/60 text-lg max-w-md font-[var(--font-body)]">
            Request an account to join the integrated platform for shipment tracking, customer management, and real-time order monitoring.
          </p>
        </div>
        <div className="relative z-10 text-sm text-white/40">
          © {new Date().getFullYear()} mshipping. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2 animate-fadeIn">
        <div className="w-full max-w-md space-y-8 bg-[var(--color-surface)] p-8 sm:p-10 rounded-[var(--radius-lg)] shadow-xl lg:shadow-none lg:bg-transparent">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-primary)] font-[var(--font-display)]">Sign Up</h2>
            <p className="mt-2 text-sm text-[var(--color-secondary)]">
              Create a new account
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
                  placeholder="Enter a unique username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--color-primary)]">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-primary)]">
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3 pr-10 text-[var(--color-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--color-primary)]">
                  Confirm Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-[var(--radius-md)] bg-red-50 border border-red-200 p-3">
                <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="rounded-[var(--radius-md)] bg-green-50 border border-green-200 p-3">
                <p className="text-sm font-medium text-green-700">{success}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Sign Up
            </Button>

            <div className="text-center mt-4">
              <p className="text-sm text-[var(--color-secondary)]">
                Sudah punya akun?{' '}
                <a href={ROUTES.LOGIN} className="font-medium text-[var(--color-tertiary)] hover:underline">
                  Login
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
