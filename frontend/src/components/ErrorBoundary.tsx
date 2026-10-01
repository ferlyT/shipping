import React, { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    console.error('Captured by ErrorBoundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    window.location.href = '/mshipping/overview/dashboard'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-[var(--color-primary)] mb-2">
            Terjadi Kesalahan Tampilan
          </h2>

          <p className="text-sm text-[var(--color-secondary)] max-w-md mb-6 leading-relaxed">
            Halaman ini mengalami kendala tak terduga. Silakan coba muat ulang bagian ini atau kembali ke halaman utama.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--color-tertiary)] text-[var(--color-on-primary)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Coba Lagi
            </button>

            <button
              type="button"
              onClick={this.handleGoHome}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-primary)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Kembali ke Beranda
            </button>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <div className="mt-8 p-4 rounded-xl bg-black/40 border border-rose-500/30 text-left max-w-2xl w-full overflow-auto text-xs text-rose-300 font-mono">
              <div className="font-bold mb-1">{this.state.error.toString()}</div>
              {this.state.errorInfo?.componentStack && (
                <pre className="whitespace-pre-wrap text-[11px] opacity-80 mt-2">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
