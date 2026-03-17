"use client"

import { useEffect, useMemo, useState } from "react"
import { createOrder, getMenu, type MenuItem } from "@/lib/api"

type CartLine = { item: MenuItem; qty: number }

function money(n: number) {
  return `₹${n.toFixed(0)}`
}

export default function StudentMenuPage() {
  const [menu, setMenu] = useState<MenuItem[] | null>(null)
  const [cart, setCart] = useState<Record<string, CartLine>>({})
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CASH">("UPI")
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "UNPAID">("PAID")
  const [whatsapp, setWhatsapp] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [lastOrder, setLastOrder] = useState<{ order_id: string; order_number: number } | null>(null)

  useEffect(() => {
    getMenu()
      .then(setMenu)
      .catch((e) => setErr(e.message))
  }, [])

  useEffect(() => {
    if (paymentMethod === "CASH") setPaymentStatus("UNPAID")
    if (paymentMethod === "UPI") setPaymentStatus("PAID")
  }, [paymentMethod])

  const totals = useMemo(() => {
    const lines = Object.values(cart)
    const items = lines.reduce((a, l) => a + l.qty, 0)
    const amount = lines.reduce((a, l) => a + l.qty * l.item.price, 0)
    return { items, amount }
  }, [cart])

  async function placeOrder() {
    setErr(null)
    setBusy(true)
    try {
      const items = Object.values(cart)
        .filter((l) => l.qty > 0)
        .map((l) => ({ menu_item_id: l.item.id, qty: l.qty }))
      if (!items.length) throw new Error("Please add at least 1 item")
      const whatsapp_number = whatsapp.trim() ? whatsapp.trim() : undefined
      const res = await createOrder({ items, payment_method: paymentMethod, payment_status: paymentStatus, whatsapp_number })
      setLastOrder(res)
      setCart({})
      localStorage.setItem("last_order_id", res.order_id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to place order")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <div className="row">
          <h1 className="h1">Smart QR Canteen</h1>
          <span className="badge">Student Menu</span>
          <div className="spacer" />
          <a className="btn" href="/order">
            Track Order
          </a>
          <a className="btn" href="/staff">
            Staff Dashboard
          </a>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          Scan QR, order from your phone, and collect when announced.
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 0.9fr", alignItems: "start" }}>
        <div className="card">
          <div className="row">
            <div style={{ fontWeight: 700 }}>Menu</div>
            <div className="spacer" />
            {menu ? <span className="badge">{menu.filter((m) => m.available).length} available</span> : <span className="badge">Loading</span>}
          </div>

          {err ? <div style={{ marginTop: 10, color: "var(--bad)" }}>{err}</div> : null}

          <div style={{ marginTop: 12 }}>
            {menu?.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Price</th>
                    <th style={{ width: 220 }}>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {menu.map((m) => {
                    const line = cart[m.id]?.qty ?? 0
                    return (
                      <tr key={m.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{m.name}</div>
                          <div className="muted">{m.available ? "Available" : "Out of stock"}</div>
                        </td>
                        <td>{money(m.price)}</td>
                        <td>
                          <div className="row" style={{ justifyContent: "flex-start" }}>
                            <button
                              className="btn"
                              disabled={!m.available || line <= 0}
                              onClick={() =>
                                setCart((c) => {
                                  const next = { ...c }
                                  const qty = Math.max(0, (next[m.id]?.qty ?? 0) - 1)
                                  if (qty === 0) delete next[m.id]
                                  else next[m.id] = { item: m, qty }
                                  return next
                                })
                              }
                            >
                              -
                            </button>
                            <div className="badge" style={{ minWidth: 44, textAlign: "center" }}>
                              {line}
                            </div>
                            <button
                              className="btn"
                              disabled={!m.available}
                              onClick={() =>
                                setCart((c) => {
                                  const next = { ...c }
                                  const qty = (next[m.id]?.qty ?? 0) + 1
                                  next[m.id] = { item: m, qty }
                                  return next
                                })
                              }
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="muted" style={{ marginTop: 10 }}>
                {menu ? "No items yet" : "Loading menu"}
              </div>
            )}
          </div>
        </div>

        <div className="grid" style={{ gap: 14 }}>
          <div className="card">
            <div className="row">
              <div style={{ fontWeight: 700 }}>Cart</div>
              <div className="spacer" />
              <span className="badge">{totals.items} items</span>
              <span className="badge badgeGood">{money(totals.amount)}</span>
            </div>
            <div style={{ marginTop: 12 }} className="grid">
              <label className="grid" style={{ gap: 8 }}>
                <div className="muted">WhatsApp number (optional)</div>
                <input className="input" placeholder="e.g. 9876543210" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </label>

              <label className="grid" style={{ gap: 8 }}>
                <div className="muted">Payment method</div>
                <select className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash at counter</option>
                </select>
              </label>

              <div className="row">
                <span className={`badge ${paymentStatus === "PAID" ? "badgeGood" : "badgeWarn"}`}>{paymentStatus}</span>
                <div className="spacer" />
                <button className="btn btnPrimary" disabled={busy || totals.items === 0} onClick={placeOrder}>
                  {busy ? "Placing..." : "Place Order"}
                </button>
              </div>

              {lastOrder ? (
                <div className="card" style={{ borderRadius: 14, padding: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>Order #{lastOrder.order_number}</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Your order is placed. You’ll hear an announcement when it’s ready.
                  </div>
                  <div className="row" style={{ marginTop: 10 }}>
                    <a className="btn btnGood" href={`/order?orderId=${encodeURIComponent(lastOrder.order_id)}`}>
                      Track now
                    </a>
                    <button className="btn" onClick={() => setLastOrder(null)}>
                      Close
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 700 }}>Notices</div>
            <StudentNotices />
          </div>
        </div>
      </div>
    </div>
  )
}

function StudentNotices() {
  const [items, setItems] = useState<Array<{ id: string; kind: "NOTICE" | "TASK"; title: string; message: string; created_at: string }> | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    import("@/lib/api")
      .then((m) => m.getNotices())
      .then(setItems)
      .catch((e) => setErr(e.message))
  }, [])

  if (err) return <div style={{ marginTop: 10, color: "var(--bad)" }}>{err}</div>
  if (!items) return <div className="muted" style={{ marginTop: 10 }}>Loading...</div>
  if (!items.length) return <div className="muted" style={{ marginTop: 10 }}>No notices</div>

  return (
    <div className="grid" style={{ marginTop: 10 }}>
      {items.slice(0, 6).map((n) => (
        <div key={n.id} className="card" style={{ padding: 12, borderRadius: 14 }}>
          <div className="row">
            <span className={`badge ${n.kind === "TASK" ? "badgeWarn" : ""}`}>{n.kind}</span>
            <div className="spacer" />
            <span className="badge">{new Date(n.created_at).toLocaleString()}</span>
          </div>
          <div style={{ marginTop: 8, fontWeight: 800 }}>{n.title}</div>
          <div className="muted" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
            {n.message}
          </div>
        </div>
      ))}
    </div>
  )
}

