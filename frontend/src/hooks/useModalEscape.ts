import { useEffect } from 'react'

/**
 * Hook to automatically close a modal, drawer, or dialog when the Escape key is pressed.
 * 
 * @param isOpen Boolean indicating if the modal is currently open
 * @param onClose Callback function to invoke when Escape key is pressed
 */
export function useModalEscape(isOpen: boolean, onClose?: (() => void) | null) {
  useEffect(() => {
    if (!isOpen || !onClose) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])
}
