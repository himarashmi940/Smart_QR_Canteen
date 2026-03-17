import { supabase } from "./supabase.js"

export async function listMenu() {
  const { data, error } = await supabase.from("menu_items").select("id,name,price,available").order("name", { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function nextOrderNumber() {
  const { data, error } = await supabase.rpc("next_order_number")
  if (error) throw new Error(error.message)
  if (typeof data !== "number") throw new Error("Invalid order number")
  return data
}

export async function createOrder({ items, payment_method, payment_status, whatsapp_number }) {
  const order_number = await nextOrderNumber()
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      order_number,
      status: "PLACED",
      payment_method,
      payment_status,
      whatsapp_number: whatsapp_number ?? null
    })
    .select("id,order_number")
    .single()
  if (orderErr) throw new Error(orderErr.message)

  const { data: menu, error: menuErr } = await supabase
    .from("menu_items")
    .select("id,name,price,available")
    .in(
      "id",
      items.map((i) => i.menu_item_id)
    )
  if (menuErr) throw new Error(menuErr.message)
  const menuMap = new Map((menu ?? []).map((m) => [m.id, m]))

  const rows = items.map((i) => {
    const m = menuMap.get(i.menu_item_id)
    if (!m) throw new Error("Menu item not found")
    if (!m.available) throw new Error(`Item unavailable: ${m.name}`)
    return { order_id: order.id, menu_item_id: m.id, name: m.name, price: m.price, qty: i.qty }
  })

  const { error: itemsErr } = await supabase.from("order_items").insert(rows)
  if (itemsErr) throw new Error(itemsErr.message)

  return { order_id: order.id, order_number: order.order_number }
}

export async function getOrder(orderId) {
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id,order_number,status,payment_method,payment_status,whatsapp_number,created_at")
    .eq("id", orderId)
    .single()
  if (orderErr) throw new Error(orderErr.message)

  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("menu_item_id,name,qty,price")
    .eq("order_id", orderId)
    .order("name", { ascending: true })
  if (itemsErr) throw new Error(itemsErr.message)

  return { ...order, items: items ?? [] }
}

export async function listOrders({ status }) {
  let q = supabase.from("orders").select("id,order_number,status,payment_method,payment_status,whatsapp_number,created_at").order("created_at", { ascending: false }).limit(200)
  if (status) q = q.eq("status", status)
  const { data: orders, error: ordersErr } = await q
  if (ordersErr) throw new Error(ordersErr.message)
  const ids = (orders ?? []).map((o) => o.id)
  if (!ids.length) return []

  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("order_id,menu_item_id,name,qty,price")
    .in("order_id", ids)
  if (itemsErr) throw new Error(itemsErr.message)

  const byOrder = new Map()
  for (const it of items ?? []) {
    const arr = byOrder.get(it.order_id) ?? []
    arr.push({ menu_item_id: it.menu_item_id, name: it.name, qty: it.qty, price: it.price })
    byOrder.set(it.order_id, arr)
  }

  return (orders ?? []).map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] }))
}

export async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabase.from("orders").update({ status }).eq("id", orderId).select("id,order_number,status").single()
  if (error) throw new Error(error.message)
  return data
}

export async function addNotice({ kind, title, message }) {
  const { data, error } = await supabase
    .from("notices")
    .insert({ kind, title, message })
    .select("id,kind,title,message,created_at")
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function listNotices() {
  const { data, error } = await supabase
    .from("notices")
    .select("id,kind,title,message,created_at")
    .order("created_at", { ascending: false })
    .limit(30)
  if (error) throw new Error(error.message)
  return data ?? []
}

