import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { registerGameHandlers } from './gameHandlers.js'

export let io: Server

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env['CLIENT_URL'] ?? 'http://localhost:5173',
      credentials: true,
    },
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
