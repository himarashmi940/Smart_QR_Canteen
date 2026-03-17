"use client"

import { useEffect, useMemo, useState } from "react"
import { getOrder, type Order } from "@/lib/api"
import { getSocket } from "@/lib/socket"
import { speak } from "@/lib/tts"

function useQueryOrderId() {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    const url = new URL(window.location.href)
    const q = url.searchParams.get("orderId")
    if (q) {
      setId(q)
      localStorage.setItem("last_order_id", q)
      return
    }
    const last = localStorage.getItem("last_order_id")
    setId(last)
  }, [])
  return id
}

function money(n: number) {
  return `₹${n.toFixed(0)}`
}

export default function OrderStatusPage() {
  const orderId = useQueryOrderId()
  const [order, setOrder] = useState<Order | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [listen, setListen] = useState(true)

  const amount = useMemo(() => {
    if (!order) return 0
    return order.items.reduce((a, i) => a + i.qty * i.price, 0)
  }, [order])

  useEffect(() => {
    if (!orderId) return
    setErr(null)
    getOrder(orderId)
      .then(setOrder)
      .catch((e) => setErr(e.message))
  }, [orderId])

  useEffect(() => {
    const s = getSocket()
    if (!s) return
    const onReady = (payload: { order_id: string; order_number: number }) => {
      if (!listen) return
      if (!orderId) return
      if (payload.order_id !== orderId) return
      speak(`Order number ${payload.order_number} is ready. Please collect your food.`)
      getOrder(orderId).then(setOrder).catch(() => {})
    }
    const onUpdated = (payload: { order_id: string }) => {
      if (!orderId) return
      if (payload.order_id !== orderId) return
      getOrder(orderId).then(setOrder).catch(() => {})
    }
    s.on("order_ready", onReady)
    s.on("order_updated", onUpdated)
    return () => {
      s.off("order_ready", onReady)
      s.off("order_updated", onUpdated)
    }
  }, [orderId, listen])

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <div className="row">
          <h1 className="h1">Track Order</h1>
          <span className="badge">Student</span>
          <div className="spacer" />
          <a className="btn" href="/">
            Menu
          </a>
          <a className="btn" href="/staff">
            Staff Dashboard
          </a>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          Keep this page open to hear your order announcement.
        </div>
      </div>

      <div className="card">
        <div className="row">
          <div style={{ fontWeight: 800 }}>Order ID</div>
          <div className="spacer" />
          <button className="btn" onClick={() => setListen((v) => !v)}>
            Voice: {listen ? "On" : "Off"}
          </button>
        </div>
        <div className="muted" style={{ marginTop: 8, wordBreak: "break-all" }}>
          {orderId ?? "No order selected yet"}
        </div>
      </div>

      {err ? <div className="card" style={{ color: "var(--bad)" }}>{err}</div> : null}

      {order ? (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
          <div className="card">
            <div className="row">
              <div style={{ fontWeight: 900, fontSize: 22 }}>Order #{order.order_number}</div>
              <div className="spacer" />
              <span
                className={`badge ${
                  order.status === "READY" ? "badgeGood" : order.status === "CANCELLED" ? "badgeBad" : order.status === "COLLECTED" ? "badgeGood" : "badgeWarn"
                }`}
              >
                {order.status}
              </span>
              <span className={`badge ${order.payment_status === "PAID" ? "badgeGood" : "badgeWarn"}`}>{order.payment_method} {order.payment_status}</span>
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              Placed at {new Date(order.created_at).toLocaleString()}
            </div>
            <div style={{ marginTop: 14 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.menu_item_id}>
                      <td>{i.name}</td>
                      <td>{i.qty}</td>
                      <td>{money(i.qty * i.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="row" style={{ marginTop: 12 }}>
                <div className="spacer" />
                <span className="badge badgeGood">Total {money(amount)}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 800 }}>What happens next</div>
            <div className="grid" style={{ marginTop: 12 }}>
              <div className="card" style={{ padding: 12, borderRadius: 14 }}>
                <div style={{ fontWeight: 800 }}>1) Staff sees your order</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  It appears instantly on the dashboard.
                </div>
              </div>
              <div className="card" style={{ padding: 12, borderRadius: 14 }}>
                <div style={{ fontWeight: 800 }}>2) Food is prepared</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Status becomes PREPARING.
                </div>
              </div>
              <div className="card" style={{ padding: 12, borderRadius: 14 }}>
                <div style={{ fontWeight: 800 }}>3) Ready announcement</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  When staff taps Order Ready, your phone can announce it via voice.
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn btnPrimary" onClick={() => speak(`Order number ${order.order_number} is ready. Please collect your food.`)}>
                    Test voice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="muted">Select an order by opening this page from the menu after placing an order.</div>
        </div>
      )}
    </div>
  )
}

