import { create } from 'zustand'

interface UiState {
  isSidebarOpen: boolean
  isSidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebarCollapse: () => void
}

const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: isDesktop,
  isSidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebarCollapse: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
}))
