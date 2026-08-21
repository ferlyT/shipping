import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'
import { updateProfileSchema, changePasswordSchema } from './profile.schema'
import { getProfile, updateProfile, changePassword, uploadAvatar } from './profile.service'

const profileRoutes = new Hono()

// Semua endpoint profile membutuhkan user yang telah terautentikasi (admin / viewer)
profileRoutes.use('*', authMiddleware)

// 1. Ambil data profil user saat ini
profileRoutes.get('/', async (c) => {
  try {
    const userPayload = c.get('user')
    const user = await getProfile(userPayload.userId)
    return successResponse(c, user)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 400)
  }
})

// 2. Perbarui profil (nama lengkap, avatarUrl)
profileRoutes.put('/', zValidator('json', updateProfileSchema), async (c) => {
  try {
    const userPayload = c.get('user')
    const body = c.req.valid('json')
    const user = await updateProfile(userPayload.userId, body)
    return successResponse(c, user)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 400)
  }
})

// 3. Ganti password
profileRoutes.put('/password', zValidator('json', changePasswordSchema), async (c) => {
  try {
    const userPayload = c.get('user')
    const body = c.req.valid('json')
    const result = await changePassword(userPayload.userId, body)
    return successResponse(c, result)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 400)
  }
})

// 4. Upload foto profil
profileRoutes.post('/avatar', async (c) => {
  try {
    const userPayload = c.get('user')
    const body = await c.req.parseBody()
    const file = body['avatar']

    if (!file || !(file instanceof File)) {
      return errorResponse(c, 'File gambar avatar wajib disertakan', 400)
    }

    const result = await uploadAvatar(userPayload.userId, file)
    return successResponse(c, result)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 400)
  }
})

// 5. Hapus foto profil (kembali ke default)
profileRoutes.delete('/avatar', async (c) => {
  try {
    const userPayload = c.get('user')
    const user = await updateProfile(userPayload.userId, { fullName: userPayload.username, avatarUrl: null })
    return successResponse(c, user)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 400)
  }
})

export { profileRoutes }
