import { z } from 'zod'

export const UploadBillingAttachmentSchema = z.object({
  fileBase64: z.string().min(1, 'Data berkas (Base64) wajib diisi'),
  fileName: z.string().min(1, 'Nama berkas wajib diisi').max(255),
  fileType: z.string().optional(),
  caption: z.string().max(255).optional(),
})

export type UploadBillingAttachmentInput = z.infer<typeof UploadBillingAttachmentSchema>

export interface BillingAttachmentItem {
  fdId: number
  fdInvNo: string
  fdFileName: string
  fdFileSavedName: string
  fdFileType: string
  fdFileSize: number
  fdFileUrl: string
  fdCaption: string | null
  fdUploadedBy: string
  fdCreatedAt: Date
}
