import { env } from "@/lib/env"
import { io, Socket } from "socket.io-client"

let socket: Socket | null = null

export function getSocket() {
  if (typeof window === "undefined") return null
  if (socket) return socket
  socket = io(env.NEXT_PUBLIC_SOCKET_URL, { transports: ["websocket"] })
  return socket
}

