"use client"

import { useEffect, useMemo, useState } from "react"
import { getSocket } from "@/lib/socket"
import { listOrders, updateOrderStatus, upsertNotice, type Order } from "@/lib/api"
import { speak } from "@/lib/tts"

function money(n: number) {
  return `₹${n.toFixed(0)}`
}

function orderAmount(o: Order) {
  return o.items.reduce((a, i) => a + i.qty * i.price, 0)
}

export default function StaffDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE")
  const [err, setErr] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [announce, setAnnounce] = useState(true)
  const [noticeKind, setNoticeKind] = useState<"NOTICE" | "TASK">("NOTICE")
  const [noticeTitle, setNoticeTitle] = useState("")
  const [noticeMessage, setNoticeMessage] = useState("")
  const [noticeBusy, setNoticeBusy] = useState(false)

  const kpis = useMemo(() => {
    const active = orders.filter((o) => o.status !== "COLLECTED" && o.status !== "CANCELLED")
    const ready = orders.filter((o) => o.status === "READY")
    const unpaid = orders.filter((o) => o.payment_status === "UNPAID" && o.status !== "CANCELLED")
    const revenue = orders.filter((o) => o.payment_status === "PAID" && o.status !== "CANCELLED").reduce((a, o) => a + orderAmount(o), 0)
    return { total: orders.length, active: active.length, ready: ready.length, unpaid: unpaid.length, revenue }
  }, [orders])

  async function refresh() {
    setErr(null)
    try {
      const status = statusFilter === "ACTIVE" ? undefined : statusFilter
      const data = await listOrders({ status })
      setOrders(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load orders")
    }
  }

  useEffect(() => {
    refresh()
  }, [statusFilter])

  useEffect(() => {
    const s = getSocket()
    if (!s) return
    const onNew = () => refresh()
    const onUpdated = () => refresh()
    const onReady = (payload: { order_number: number }) => {
      if (!announce) return
      speak(`Order number ${payload.order_number} is ready. Please collect your food.`)
    }
    s.on("order_created", onNew)
    s.on("order_updated", onUpdated)
    s.on("order_ready", onReady)
    return () => {
      s.off("order_created", onNew)
      s.off("order_updated", onUpdated)
      s.off("order_ready", onReady)
    }
  }, [announce, statusFilter])

  async function setStatus(orderId: string, status: Order["status"]) {
    setBusyId(orderId)
    setErr(null)
    try {
      await updateOrderStatus(orderId, status)
      await refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed")
    } finally {
      setBusyId(null)
    }
  }

  async function postNotice() {
    setNoticeBusy(true)
    setErr(null)
    try {
      const title = noticeTitle.trim()
      const message = noticeMessage.trim()
      if (!title || !message) throw new Error("Enter title and message")
      await upsertNotice({ kind: noticeKind, title, message })
      setNoticeTitle("")
      setNoticeMessage("")
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to post")
    } finally {
      setNoticeBusy(false)
    }
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <div className="row">
          <h1 className="h1">Staff Dashboard</h1>
          <span className="badge">Tablet</span>
          <div className="spacer" />
          <a className="btn" href="/">
            Student Menu
          </a>
          <a className="btn" href="/order">
            Order Tracking
          </a>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          Tap “Ready” to announce automatically.
        </div>
      </div>

      <div className="kpi">
        <div className="card">
          <div className="muted">Total</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{kpis.total}</div>
        </div>
        <div className="card">
          <div className="muted">Active</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{kpis.active}</div>
        </div>
        <div className="card">
          <div className="muted">Ready</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{kpis.ready}</div>
        </div>
        <div className="card">
          <div className="muted">Revenue (paid)</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{money(kpis.revenue)}</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.5fr 0.8fr", alignItems: "start" }}>
        <div className="card">
          <div className="row">
            <div style={{ fontWeight: 800 }}>Orders</div>
            <div className="spacer" />
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 220 }}>
              <option value="ACTIVE">Active</option>
              <option value="PLACED">PLACED</option>
              <option value="PREPARING">PREPARING</option>
              <option value="READY">READY</option>
              <option value="COLLECTED">COLLECTED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <button className="btn" onClick={refresh}>
              Refresh
            </button>
            <button className="btn" onClick={() => setAnnounce((v) => !v)}>
              Voice: {announce ? "On" : "Off"}
            </button>
          </div>
          {err ? <div style={{ marginTop: 10, color: "var(--bad)" }}>{err}</div> : null}

          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>WhatsApp</th>
                  <th>Status</th>
                  <th style={{ width: 320 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div style={{ fontWeight: 900, fontSize: 18 }}>#{o.order_number}</div>
                      <div className="muted">{new Date(o.created_at).toLocaleTimeString()}</div>
                      <div className="muted">{money(orderAmount(o))}</div>
                    </td>
                    <td>
                      <div className="grid" style={{ gap: 6 }}>
                        {o.items.map((i) => (
                          <div key={i.menu_item_id} className="row" style={{ gap: 8 }}>
                            <span className="badge">{i.qty}</span>
                            <span>{i.name}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="grid" style={{ gap: 6 }}>
                        <span className="badge">{o.payment_method}</span>
                        <span className={`badge ${o.payment_status === "PAID" ? "badgeGood" : "badgeWarn"}`}>{o.payment_status}</span>
                      </div>
                    </td>
                    <td className="muted">{o.whatsapp_number ?? "-"}</td>
                    <td>
                      <span
                        className={`badge ${
                          o.status === "READY" ? "badgeGood" : o.status === "CANCELLED" ? "badgeBad" : o.status === "COLLECTED" ? "badgeGood" : "badgeWarn"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <div className="row" style={{ justifyContent: "flex-start" }}>
                        <button className="btn" disabled={busyId === o.id} onClick={() => setStatus(o.id, "PREPARING")}>
                          Preparing
                        </button>
                        <button className="btn btnGood" disabled={busyId === o.id} onClick={() => setStatus(o.id, "READY")}>
                          Ready
                        </button>
                        <button className="btn" disabled={busyId === o.id} onClick={() => setStatus(o.id, "COLLECTED")}>
                          Collected
                        </button>
                        <button className="btn btnBad" disabled={busyId === o.id} onClick={() => setStatus(o.id, "CANCELLED")}>
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!orders.length ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      No orders
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid" style={{ gap: 14 }}>
          <div className="card">
            <div style={{ fontWeight: 800 }}>Notice / Task</div>
            <div className="grid" style={{ marginTop: 12 }}>
              <select className="select" value={noticeKind} onChange={(e) => setNoticeKind(e.target.value as any)}>
                <option value="NOTICE">NOTICE</option>
                <option value="TASK">TASK</option>
              </select>
              <input className="input" placeholder="Title" value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} />
              <textarea className="textarea" placeholder="Message" value={noticeMessage} onChange={(e) => setNoticeMessage(e.target.value)} />
              <button className="btn btnPrimary" disabled={noticeBusy} onClick={postNotice}>
                {noticeBusy ? "Posting..." : "Post"}
              </button>
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 800 }}>Speaker test</div>
            <div className="muted" style={{ marginTop: 8 }}>
              Use this on the tablet connected to speakers.
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn btnPrimary" onClick={() => speak("Order number 52 is ready. Please collect your food.")}>
                Test announcement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

