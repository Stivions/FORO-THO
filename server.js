const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev  = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT ?? '3002', 10)
const app  = next({ dev })
const handle = app.getRequestHandler()

// roomId -> Map<socketId, { userId, username, avatar }>
const rooms = new Map()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  })

  io.on('connection', (socket) => {
    let currentRoom = null
    let currentUser = null

    socket.on('voice:join', ({ roomId, userId, username, avatar }) => {
      // Si estaba en otra sala, la abandona primero
      if (currentRoom) {
        leaveRoom(socket, currentRoom)
      }

      currentRoom = roomId
      currentUser = { userId, username, avatar }

      socket.join(roomId)

      if (!rooms.has(roomId)) rooms.set(roomId, new Map())
      rooms.get(roomId).set(socket.id, { userId, username, avatar, socketId: socket.id })

      // Avisa a todos en la sala que llegó alguien
      socket.to(roomId).emit('voice:user-joined', {
        socketId: socket.id,
        userId, username, avatar,
      })

      // Envía al nuevo la lista de quienes ya están
      const members = [...rooms.get(roomId).entries()]
        .filter(([sid]) => sid !== socket.id)
        .map(([sid, u]) => ({ socketId: sid, ...u }))

      socket.emit('voice:room-members', members)
    })

    socket.on('voice:leave', () => {
      if (currentRoom) leaveRoom(socket, currentRoom)
    })

    // WebRTC signaling
    socket.on('voice:offer', ({ to, offer }) => {
      socket.to(to).emit('voice:offer', { from: socket.id, offer })
    })
    socket.on('voice:answer', ({ to, answer }) => {
      socket.to(to).emit('voice:answer', { from: socket.id, answer })
    })
    socket.on('voice:ice', ({ to, candidate }) => {
      socket.to(to).emit('voice:ice', { from: socket.id, candidate })
    })

    // Mute/unmute
    socket.on('voice:mute', ({ roomId, muted }) => {
      if (roomId && rooms.has(roomId) && rooms.get(roomId).has(socket.id)) {
        rooms.get(roomId).get(socket.id).muted = muted
        socket.to(roomId).emit('voice:mute', { socketId: socket.id, muted })
      }
    })

    socket.on('disconnect', () => {
      if (currentRoom) leaveRoom(socket, currentRoom)
    })

    function leaveRoom(sock, roomId) {
      sock.leave(roomId)
      if (rooms.has(roomId)) {
        rooms.get(roomId).delete(sock.id)
        if (rooms.get(roomId).size === 0) rooms.delete(roomId)
      }
      io.to(roomId).emit('voice:user-left', { socketId: sock.id })
      currentRoom = null
      currentUser = null
    }
  })

  // Endpoint REST para ver miembros de una sala
  httpServer.on('request', (req, res) => {
    if (req.url?.startsWith('/api/voice/rooms/') && req.method === 'GET') {
      const roomId = req.url.split('/').pop()
      const members = rooms.has(roomId)
        ? [...rooms.get(roomId).values()]
        : []
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ members }))
    }
  })

  httpServer.listen(port, () => {
    console.log(`> Forum ready on http://localhost:${port}`)
  })
})
