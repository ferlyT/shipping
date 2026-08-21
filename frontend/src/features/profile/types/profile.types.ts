export interface UserProfile {
  id: string
  username: string
  fullName: string
  role: string
  avatarUrl: string | null
  createdAt: string
  lastLoginAt: string | null
}

export interface UpdateProfileInput {
  fullName: string
  avatarUrl?: string | null
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
