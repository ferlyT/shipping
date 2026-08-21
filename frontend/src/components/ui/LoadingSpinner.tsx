interface LoadingSpinnerProps {
  message?: string
  fullscreen?: boolean
}

/**
 * Komponen loading spinner standar proyek mshipping.
 * Gunakan komponen ini di semua page sebagai state awal (initial load).
 *
 * Pola penggunaan di page:
 *   if (isLoading) return <LoadingSpinner message="Memuat data..." />
 *
 * Untuk refreshing (data sudah ada, hanya diperbarui), gunakan progress bar
 * atau opacity overlay di dalam tabel — JANGAN fullscreen spinner.
 */
export function LoadingSpinner({ message = 'Memuat data...', fullscreen = true }: LoadingSpinnerProps) {
  return (
    <div
      className={
        fullscreen
          ? 'p-6 h-full flex flex-col justify-center items-center gap-4'
          : 'py-16 flex flex-col justify-center items-center gap-4'
      }
    >
      <span className="w-10 h-10 border-4 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
      <p className="text-[var(--color-secondary)] text-sm animate-pulse">{message}</p>
    </div>
  )
}
