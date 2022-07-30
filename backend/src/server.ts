import { Server, Socket } from 'socket.io';
import { ClientMsg } from './messages';
import { randomBytes } from 'crypto';
import { ClientMsgMap, ServerMsgMap } from './socketTypes';

import { readFileSync } from 'fs';
import { createServer } from 'https';

const httpServer = createServer({
  key: readFileSync('cert/privkey.pem'),
  cert: readFileSync('cert/cert.pem'),
});

const io = new Server<ClientMsgMap, ServerMsgMap>(httpServer, {
  cors: {
    origin: '*',
  },
});

httpServer.listen(8443);

io.on('connection', socket => setupSocket(socket));

interface SocketData {
  username?: string;
}

const sockets: Map<string, SocketData> = new Map();

function setupSocket(socket: Socket<ClientMsgMap, ServerMsgMap>): void {
  sockets.set(socket.id, {});
  socket.use((ev, next) => {
    if (ev[0] !== 'introduce' && socketData(socket).username === undefined) {
      return next(new Error("user hasn't introduced yet"));
    }
    return next();
  });

  socket.on('introduce', (msg: ClientMsg<'introduce'>) => {
    socketData(socket).username = msg.data.user;
    socket.emit('msgAck', { messageId: msg.messageId });
  });
  socket.on('new', (msg: ClientMsg<'new'>) => {
    const sessionId = generateRoomId();
    socket.join(sessionId);
    socket.emit('sessionCreated', { sessionId, messageId: msg.messageId });
  });
  socket.on('leave', (msg: ClientMsg<'leave'>) => {
    const data = socketData(socket);
    for (const room of socket.rooms) {
      if (room === socket.id) {
        continue;
      }
      socket.leave(room);
      socket.to(room).emit('participantChange', { user: data.username, joined: false });
    }
    socket.emit('msgAck', { messageId: msg.messageId });
  });
  socket.on('join', (msg: ClientMsg<'join'>) => {
    const data = socketData(socket);
    if (!io.sockets.adapter.rooms.has(msg.data.sessionId)) {
      console.log(msg.data.sessionId, io.sockets.adapter.rooms);
      socket.emit('msgAck', { error: 'unknown session', messageId: msg.messageId });
      return;
    }
    if (socket.rooms.size !== 1) {
      socket.emit('msgAck', { error: 'socket is already in a room', messageId: msg.messageId });
    }
    socket.join(msg.data.sessionId);
    socket.to(msg.data.sessionId).emit('participantChange', { user: data.username, joined: true });

    socket.emit('msgAck', { messageId: msg.messageId });
  });
  socket.on('control', (msg: ClientMsg<'control'>) => {
    const data = socketData(socket);
    for (const room of socket.rooms) {
      socket.to(room).emit('control', { data: msg.data, user: data.username });
    }
    socket.emit('msgAck', { messageId: msg.messageId });
  });
}

function socketData(socket: Socket): SocketData {
  return sockets.get(socket.id);
}

function generateRoomId(): string {
  let id: string;
  do {
    id = randomBytes(16).toString('hex');
  } while (io.sockets.adapter.rooms.has(id));

  return id;
}
