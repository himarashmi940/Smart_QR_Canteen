import { env } from "@/lib/env"
import { z } from "zod"

export const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  available: z.boolean()
})

export const OrderItemSchema = z.object({
  menu_item_id: z.string(),
  name: z.string(),
  qty: z.number(),
  price: z.number()
})

export const OrderSchema = z.object({
  id: z.string(),
  order_number: z.number(),
  status: z.enum(["PLACED", "PREPARING", "READY", "COLLECTED", "CANCELLED"]),
  payment_method: z.enum(["UPI", "CASH"]),
  payment_status: z.enum(["PAID", "UNPAID"]),
  whatsapp_number: z.string().nullable(),
  created_at: z.string(),
  items: z.array(OrderItemSchema)
})

export type MenuItem = z.infer<typeof MenuItemSchema>
export type Order = z.infer<typeof OrderSchema>

async function http<T>(path: string, init?: RequestInit, schema?: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store"
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg = data?.error ?? `Request failed: ${res.status}`
    throw new Error(msg)
  }
  return schema ? schema.parse(data) : (data as T)
}

export async function getMenu() {
  return http("/menu", { method: "GET" }, z.array(MenuItemSchema))
}

export async function createOrder(input: {
  items: Array<{ menu_item_id: string; qty: number }>
  payment_method: "UPI" | "CASH"
  payment_status: "PAID" | "UNPAID"
  whatsapp_number?: string
}) {
  return http(
    "/orders",
    { method: "POST", body: JSON.stringify(input) },
    z.object({ order_id: z.string(), order_number: z.number() })
  )
}

export async function getOrder(orderId: string) {
  return http(`/orders/${orderId}`, { method: "GET" }, OrderSchema)
}

export async function listOrders(params: { status?: string } = {}) {
  const q = params.status ? `?status=${encodeURIComponent(params.status)}` : ""
  return http(`/staff/orders${q}`, { method: "GET" }, z.array(OrderSchema))
}

export async function updateOrderStatus(orderId: string, status: Order["status"]) {
  return http(`/staff/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, z.any())
}

export async function upsertNotice(input: { kind: "NOTICE" | "TASK"; title: string; message: string }) {
  return http("/staff/notices", { method: "POST", body: JSON.stringify(input) }, z.any())
}

export async function getNotices() {
  return http(
    "/notices",
    { method: "GET" },
    z.array(z.object({ id: z.string(), kind: z.enum(["NOTICE", "TASK"]), title: z.string(), message: z.string(), created_at: z.string() }))
  )
}

