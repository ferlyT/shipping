import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '../services/auth.service'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Eye, EyeOff, ShieldCheck, Box, BarChart3, AlertCircle, Clock, ShieldAlert } from 'lucide-react'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_SECONDS = 10 * 60 // 10 menit = 600 detik

const STORAGE_KEYS = {
  ATTEMPTS: 'mshipping_auth_failed_attempts',
  LOCKOUT_UNTIL: 'mshipping_auth_lockout_until',
}

function getStoredLockoutRemaining(): number {
  try {
    const lockoutUntilStr = localStorage.getItem(STORAGE_KEYS.LOCKOUT_UNTIL)
    if (!lockoutUntilStr) return 0
    const lockoutUntil = parseInt(lockoutUntilStr, 10)
    const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000))
    if (remaining === 0 && lockoutUntil > 0) {
      localStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL)
      localStorage.removeItem(STORAGE_KEYS.ATTEMPTS)
    }
    return remaining
  } catch {
    return 0
  }
}

function getStoredAttempts(): number {
  try {
    const attempts = localStorage.getItem(STORAGE_KEYS.ATTEMPTS)
    return attempts ? parseInt(attempts, 10) : 0
  } catch {
    return 0
  }
}

function recordLockoutImmediately(): number {
  try {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_SECONDS * 1000
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, MAX_FAILED_ATTEMPTS.toString())
    localStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, lockoutUntil.toString())
    return LOCKOUT_DURATION_SECONDS
  } catch {
    return LOCKOUT_DURATION_SECONDS
  }
}

function recordFailedAttempt(): { attempts: number; lockoutRemaining: number } {
  try {
    const current = getStoredAttempts() + 1
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, current.toString())
    if (current >= MAX_FAILED_ATTEMPTS) {
      const remaining = recordLockoutImmediately()
      return { attempts: current, lockoutRemaining: remaining }
    }
    return { attempts: current, lockoutRemaining: 0 }
  } catch {
    return { attempts: 1, lockoutRemaining: 0 }
  }
}

function clearAuthLockout(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ATTEMPTS)
    localStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL)
  } catch {}
}

function formatLockoutCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(() => getStoredLockoutRemaining())
  const [failedAttempts, setFailedAttempts] = useState<number>(() => getStoredAttempts())
  const navigate = useNavigate()
  const { login } = useAuth()

  const isLockedOut = lockoutRemaining > 0

  // Timer hitung mundur 1 detik saat terkunci
  useEffect(() => {
    if (lockoutRemaining <= 0) return

    const interval = setInterval(() => {
      setLockoutRemaining((prev) => {
        const next = prev - 1
        if (next <= 0) {
          clearAuthLockout()
          setFailedAttempts(0)
          setError('')
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [lockoutRemaining])

  // Sinkronkan sisa waktu saat tab browser kembali aktif
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const remaining = getStoredLockoutRemaining()
        setLockoutRemaining(remaining)
        setFailedAttempts(getStoredAttempts())
        if (remaining === 0 && getStoredAttempts() >= MAX_FAILED_ATTEMPTS) {
          clearAuthLockout()
          setFailedAttempts(0)
          setError('')
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const currentLockout = getStoredLockoutRemaining()
    if (currentLockout > 0) {
      setLockoutRemaining(currentLockout)
      return
    }

    if (!username || !password) {
      setError('Username dan Password wajib diisi.')
      return
    }

    setIsLoading(true)
    try {
      const response = await authApi.login({ username, password })
      clearAuthLockout()
      login(response.data.data.token, response.data.data.user)
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (err: any) {
      if (err.response?.status === 429) {
        const remaining = recordLockoutImmediately()
        setLockoutRemaining(remaining)
        setFailedAttempts(MAX_FAILED_ATTEMPTS)
      } else {
        const result = recordFailedAttempt()
        setFailedAttempts(result.attempts)
        if (result.lockoutRemaining > 0) {
          setLockoutRemaining(result.lockoutRemaining)
        } else {
          const sisa = MAX_FAILED_ATTEMPTS - result.attempts
          const serverMsg = err.response?.data?.error || err.response?.data?.message || 'Username atau password salah.'
          setError(`${serverMsg} (Sisa kesempatan: ${sisa} kali lagi).`)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-neutral)] relative overflow-x-hidden">
      {/* Top right theme toggle */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle align="right" />
      </div>

      {/* Left Panel - Branding & ERP Features */}
      <div className="hidden w-1/2 flex-col justify-between bg-[var(--color-surface)] border-r border-[var(--color-border)] p-12 lg:flex relative overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[var(--color-tertiary)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[var(--color-tertiary)]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Logo Header */}
        <div className="relative z-10">
          <Link to="/" className="inline-block">
            <h1 className="font-[var(--font-display)] font-bold text-3xl m-0 tracking-tight text-[var(--color-primary)]">
              mshipping<span className="text-[var(--color-tertiary)]">.</span>
            </h1>
          </Link>
          <p className="text-xs text-[var(--color-secondary)] mt-1 font-mono">
            Logistics & Freight Management ERP
          </p>
        </div>

        {/* Center Presentation */}
        <div className="relative z-10 space-y-6 my-auto max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-neutral)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-tertiary)]">
            <ShieldCheck size={14} />
            <span>Enterprise Freight Logistics</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold leading-tight text-[var(--color-primary)] font-[var(--font-display)] tracking-tight">
            Pengelolaan Ekspedisi, Tarif & Delivery Order Lebih Terstruktur.
          </h2>

          <p className="text-[var(--color-secondary)] text-sm sm:text-base leading-relaxed">
            Platform terpadu untuk pelacakan manifes, perhitungan margin tarif, pemantauan status kontainer real-time, dan manajemen order pelanggan.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)]">
                <Box size={14} className="text-[var(--color-tertiary)]" />
                <span>Multi-Branch Tracking</span>
              </div>
              <p className="text-[11px] text-[var(--color-secondary)]">GZ, HK, SG, SH, SZ, YW & destinasi lainnya</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)]">
                <BarChart3 size={14} className="text-[var(--color-tertiary)]" />
                <span>Price & Margin Logic</span>
              </div>
              <p className="text-[11px] text-[var(--color-secondary)]">Tarif agen marking & customer bertingkat</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-[var(--color-secondary)]">
          © {new Date().getFullYear()} mshipping ERP. Hak cipta dilindungi undang-undang.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full items-center justify-center p-6 sm:p-12 lg:w-1/2 animate-fadeIn">
        <div className="w-full max-w-md space-y-8 bg-[var(--color-surface)] p-8 sm:p-10 rounded-2xl border border-[var(--color-border)] shadow-xl lg:shadow-none lg:bg-transparent lg:border-none">
          {/* Mobile Logo View */}
          <div className="lg:hidden text-center mb-6">
            <h1 className="font-[var(--font-display)] font-bold text-3xl text-[var(--color-primary)]">
              mshipping<span className="text-[var(--color-tertiary)]">.</span>
            </h1>
            <p className="text-xs text-[var(--color-secondary)] mt-1 font-mono">
              Logistics & Freight Management ERP
            </p>
          </div>

          <div className="text-center lg:text-left space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-primary)] font-[var(--font-display)]">
              Selamat Datang
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-secondary)]">
              Masukkan kredensial akun Anda untuk mengakses sistem ERP.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLockedOut || isLoading}
                  className="block w-full h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-primary)] placeholder-[var(--color-secondary)]/40 focus:border-[var(--color-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-tertiary)]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Ketik username Anda"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLockedOut || isLoading}
                    className="block w-full h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 pr-11 text-sm font-medium text-[var(--color-primary)] placeholder-[var(--color-secondary)]/40 focus:border-[var(--color-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-tertiary)]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLockedOut || isLoading}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {isLockedOut ? (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-start gap-3 text-amber-500 dark:text-amber-400 animate-fadeIn">
                <ShieldAlert size={20} className="shrink-0 mt-0.5 text-amber-500" />
                <div className="space-y-1">
                  <p className="font-bold text-xs uppercase tracking-wide">Akses Terkunci Sementara</p>
                  <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                    Telah terjadi 5 kali percobaan login gagal. Demi keamanan akun, formulir dinonaktifkan sementara.
                  </p>
                  <div className="inline-flex items-center gap-1.5 font-mono text-sm font-bold bg-amber-500/15 px-2.5 py-1 rounded-lg mt-1 border border-amber-500/30 text-amber-700 dark:text-amber-200">
                    <Clock size={14} className="animate-pulse" />
                    <span>Silakan tunggu {formatLockoutCountdown(lockoutRemaining)}</span>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3.5 flex items-start gap-2.5 text-xs text-rose-500 dark:text-rose-400 animate-fadeIn">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-medium">{error}</p>
                  {failedAttempts > 0 && failedAttempts < MAX_FAILED_ATTEMPTS && (
                    <p className="text-[11px] opacity-80">
                      Percobaan gagal: {failedAttempts}/{MAX_FAILED_ATTEMPTS}. Setelah 5 kali salah, sistem akan terkunci 10 menit.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full h-11 text-sm font-semibold rounded-xl"
              isLoading={isLoading}
              disabled={isLockedOut}
            >
              {isLockedOut ? (
                <span className="flex items-center justify-center gap-2 font-mono">
                  <Clock size={16} />
                  <span>Terkunci ({formatLockoutCountdown(lockoutRemaining)})</span>
                </span>
              ) : (
                'Masuk ke Sistem'
              )}
            </Button>

            <div className="text-center pt-2">
              <p className="text-xs text-[var(--color-secondary)]">
                Belum punya akun?{' '}
                <Link to={ROUTES.REGISTER} className="font-semibold text-[var(--color-tertiary)] hover:underline">
                  Daftar
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}