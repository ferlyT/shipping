import { z } from 'zod'

export const CreateCustomerCommodityPriceSchema = z.object({
  fdCustCode: z.string().min(1, 'Kode customer wajib diisi'),
  category: z.string().min(1, 'Kategori komoditi wajib diisi'),
  mode: z.string().min(1, 'Moda wajib diisi'),
  branch: z.string().min(1, 'Branch wajib diisi'),
  price: z.number().positive('Harga harus lebih dari 0'),
  effectiveDate: z.string().min(1, 'Tanggal berlaku wajib diisi'),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  aliases: z.array(z.string()).optional(),
})

export type CreateCustomerCommodityPriceDto = z.infer<typeof CreateCustomerCommodityPriceSchema>

export const UpdateCustomerCommodityPriceSchema = z.object({
  category: z.string().optional(),
  mode: z.string().optional(),
  branch: z.string().optional(),
  price: z.number().positive('Harga harus lebih dari 0').optional(),
  effectiveDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  aliases: z.array(z.string()).optional(),
})

export type UpdateCustomerCommodityPriceDto = z.infer<typeof UpdateCustomerCommodityPriceSchema>

export const SetEndDateSchema = z.object({
  endDate: z.string().nullable(),
})

export const SetCustomerUploadMarkingsSchema = z.object({
  markings: z.array(
    z.object({
      markingCode: z.string().min(1, 'Marking code wajib diisi'),
      agentName: z.string().optional(),
    }),
  ).min(1, 'Field markings harus berupa array dengan minimal 1 item'),
})
