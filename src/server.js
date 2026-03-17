import "dotenv/config"
import express from "express"
import cors from "cors"
import http from "http"
import { Server as SocketIOServer } from "socket.io"
import { env } from "./env.js"
import { CreateOrderSchema, NoticeSchema, UpdateStatusSchema } from "./schemas.js"
import { addNotice, createOrder, getOrder, listMenu, listNotices, listOrders, updateOrderStatus } from "./db.js"

const app = express()
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
app.use(express.json({ limit: "1mb" }))

app.get("/api/health", (_req, res) => res.json({ ok: true }))

app.get("/api/menu", async (_req, res) => {
  try {
    const data = await listMenu()
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed" })
  }
})

app.get("/api/notices", async (_req, res) => {
  try {
    const data = await listNotices()
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed" })
  }
})

app.post("/api/orders", async (req, res) => {
  try {
    const input = CreateOrderSchema.parse(req.body)
    const data = await createOrder(input)
    io.emit("order_created", { order_id: data.order_id, order_number: data.order_number })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Invalid request" })
  }
})

app.get("/api/orders/:id", async (req, res) => {
  try {
    const data = await getOrder(req.params.id)
    res.json(data)
  } catch (e) {
    res.status(404).json({ error: e instanceof Error ? e.message : "Not found" })
  }
})

app.get("/api/staff/orders", async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined
    const data = await listOrders({ status })
    const filtered =
      !status || status === "ACTIVE"
        ? data.filter((o) => o.status !== "COLLECTED" && o.status !== "CANCELLED")
        : data
    res.json(filtered)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed" })
  }
})

app.patch("/api/staff/orders/:id/status", async (req, res) => {
  try {
    const { status } = UpdateStatusSchema.parse(req.body)
    const data = await updateOrderStatus(req.params.id, status)
    io.emit("order_updated", { order_id: data.id })
    if (status === "READY") {
      io.emit("order_ready", { order_id: data.id, order_number: data.order_number })
      triggerN8n({ order_id: data.id, order_number: data.order_number }).catch(() => {})
      triggerAiTts({ order_id: data.id, order_number: data.order_number }).catch(() => {})
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Invalid request" })
  }
})

app.post("/api/staff/notices", async (req, res) => {
  try {
    const input = NoticeSchema.parse(req.body)
    const data = await addNotice(input)
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Invalid request" })
  }
})

const server = http.createServer(app)
const io = new SocketIOServer(server, { cors: { origin: env.CORS_ORIGIN } })

io.on("connection", (socket) => {
  socket.emit("hello", { ok: true })
})

server.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`)
})

async function triggerN8n(payload) {
  if (!env.N8N_WEBHOOK_URL) return
  await fetch(env.N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  })
}

async function triggerAiTts(payload) {
  if (!env.AI_TTS_WEBHOOK_URL) return
  await fetch(env.AI_TTS_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  })
}

