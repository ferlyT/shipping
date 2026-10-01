import { Hono } from 'hono'
import { authMiddleware } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'
import { validateBody } from '../../middleware/requestValidator'
import { updateProfileSchema, changePasswordSchema } from './profile.schema'
import { getProfile, updateProfile, changePassword, uploadAvatar, uploadAvatarBase64 } from './profile.service'

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
profileRoutes.put('/', validateBody(updateProfileSchema), async (c) => {
  try {
    const userPayload = c.get('user')
    const data = c.req.valid('json')
    const user = await updateProfile(userPayload.userId, data)
    return successResponse(c, user)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 400)
  }
})

// 3. Ganti kata sandi mandiri (mendukung /password dan /change-password)
const handleChangePassword = async (c: any) => {
  try {
    const userPayload = c.get('user')
    const data = c.req.valid('json')
    const result = await changePassword(userPayload.userId, data)
    return successResponse(c, result)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 400)
  }
}
profileRoutes.put('/password', validateBody(changePasswordSchema), handleChangePassword)
profileRoutes.put('/change-password', validateBody(changePasswordSchema), handleChangePassword)

// 4. Unggah foto profil avatar (multipart/form-data atau json base64)
profileRoutes.post('/avatar', async (c) => {
  try {
    const userPayload = c.get('user')
    const contentType = c.req.header('content-type') || ''

    if (contentType.includes('application/json')) {
      const json = await c.req.json().catch(() => ({}))
      if (json.avatarBase64 && typeof json.avatarBase64 === 'string') {
        const result = await uploadAvatarBase64(userPayload.userId, json.avatarBase64)
        return successResponse(c, result)
      }
    }

    const body = (await c.req.parseBody().catch(() => ({}))) as Record<string, any>
    const file = body['avatar']

    if (file && file instanceof File) {
      const result = await uploadAvatar(userPayload.userId, file)
      return successResponse(c, result)
    }

    if (body['avatarBase64'] && typeof body['avatarBase64'] === 'string') {
      const result = await uploadAvatarBase64(userPayload.userId, body['avatarBase64'])
      return successResponse(c, result)
    }

    return errorResponse(c, 'File gambar avatar atau avatarBase64 wajib disertakan', 400)
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
