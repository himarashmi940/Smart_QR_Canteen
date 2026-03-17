import { z } from "zod"

export const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  available: z.boolean()
})

export const CreateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        menu_item_id: z.string(),
        qty: z.number().int().min(1).max(50)
      })
    )
    .min(1),
  payment_method: z.enum(["UPI", "CASH"]),
  payment_status: z.enum(["PAID", "UNPAID"]),
  whatsapp_number: z.string().optional()
})

export const UpdateStatusSchema = z.object({
  status: z.enum(["PLACED", "PREPARING", "READY", "COLLECTED", "CANCELLED"])
})

export const NoticeSchema = z.object({
  kind: z.enum(["NOTICE", "TASK"]),
  title: z.string().min(1).max(80),
  message: z.string().min(1).max(2000)
})

