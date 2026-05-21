import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { registerGameHandlers } from './gameHandlers.js'
import { verifyToken } from '../lib/jwt.js'

declare module 'socket.io' {
  interface SocketData {
    userId: string | null
    participantId?: string
    sessionId?: string
  }
}

export let io: Server

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env['CLIENT_URL'] ?? 'http://localhost:5173',
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie ?? ''
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)
    const token = match?.[1]
    if (token) {
      try {
        const payload = verifyToken(token)
        socket.data.userId = payload.userId
      } catch {
        socket.data.userId = null
      }
    } else {
      socket.data.userId = null
    }
    next()
  })

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id)
    registerGameHandlers(io, socket)
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id)
    })
  })

  return io
}
