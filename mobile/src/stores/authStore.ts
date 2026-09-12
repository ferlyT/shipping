import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

export interface User {
  id: string
  username: string
  fullName: string
  role: string
  fdEmpCode?: string | null
  fdEmpName?: string | null
  avatarUrl?: string | null
  permissions?: string[]
  defaultRoute?: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isInitialized: boolean
  login: (token: string, user: User) => Promise<void>
  updateUser: (partial: Partial<User>) => void
  logout: () => Promise<void>
  initializeAuth: () => Promise<void>
}

const TOKEN_KEY = 'mshipping_auth_token'
const USER_KEY = 'mshipping_auth_user'

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,

  login: async (token, user) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token)
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
    } catch (e) {
      console.warn('Gagal menyimpan token ke SecureStore', e)
    }
    set({ token, user, isAuthenticated: true })
  },

  updateUser: (partial) => {
    set((state) => {
      const updatedUser = state.user ? { ...state.user, ...partial } : null
      if (updatedUser) {
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser)).catch(() => {})
      }
      return { user: updatedUser }
    })
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY)
      await SecureStore.deleteItemAsync(USER_KEY)
    } catch (e) {
      console.warn('Gagal menghapus token dari SecureStore', e)
    }
    set({ token: null, user: null, isAuthenticated: false })
  },

  initializeAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY)
      const userData = await SecureStore.getItemAsync(USER_KEY)
      if (token && userData) {
        const user = JSON.parse(userData) as User
        set({ token, user, isAuthenticated: true, isInitialized: true })
        return
      }
    } catch (e) {
      console.warn('Gagal memuat sesi dari SecureStore', e)
    }
    set({ token: null, user: null, isAuthenticated: false, isInitialized: true })
  },
}))
