import { Server, Socket } from 'socket.io';
import { ClientMsg, CLIENT_MESSAGES, SERVER_MESSAGES } from './messages';
import { randomBytes } from 'crypto';

const io = new Server(3000);

io.on('connection', socket => setupSocket(socket));

function setupSocket(socket: Socket): void {
  socket.onAny(console.log);
  const data: { username?: string } = {};
  socket.on(CLIENT_MESSAGES.introduce, (msg: ClientMsg<'introduce'>) => {
    data.username = msg.data.user;
    socket.emit(SERVER_MESSAGES.introduceAck, { messageId: msg.messageId });
  });
  socket.on(CLIENT_MESSAGES.new, (msg: ClientMsg<'new'>) => {
    if (data.username === undefined) {
      socket.emit(SERVER_MESSAGES.sessionCreated, { error: "user hasn't introduced yet", messageId: msg.messageId });
      return;
    }
    const sessionId = generateRoomId();
    socket.join(sessionId);
    socket.emit(SERVER_MESSAGES.sessionCreated, { sessionId, messageId: msg.messageId });
  });
  socket.on(CLIENT_MESSAGES.leave, (msg: ClientMsg<'leave'>) => {
    if (data.username === undefined) {
      socket.emit(SERVER_MESSAGES.sessionLeft, { error: "user hasn't introduced yet", messageId: msg.messageId });
      return;
    }
    for (const room of socket.rooms) {
      socket.leave(room);
      socket.to(room).emit(SERVER_MESSAGES.participantChange, { name: data.username, joined: false });
    }
    socket.emit(SERVER_MESSAGES.sessionLeft, { messageId: msg.messageId });
  });
  socket.on(CLIENT_MESSAGES.join, (msg: ClientMsg<'join'>) => {
    if (data.username === undefined) {
      socket.emit(SERVER_MESSAGES.sessionJoined, { error: "user hasn't introduced yet", messageId: msg.messageId });
      return;
    }
    if (!io.sockets.adapter.rooms.has(msg.data.sessionId)) {
      socket.emit(SERVER_MESSAGES.sessionJoined, { error: 'unknown session', messageId: msg.messageId });
      return;
    }
    socket.join(msg.data.sessionId);
    socket.to(msg.data.sessionId).emit(SERVER_MESSAGES.participantChange, { user: data.username, joined: true });

    socket.emit(SERVER_MESSAGES.sessionJoined, { messageId: msg.messageId });
  });
  socket.on(CLIENT_MESSAGES.control, (msg: ClientMsg<'control'>) => {
    if (data.username === undefined) {
      socket.emit(SERVER_MESSAGES.controlAck, { error: "user hasn't introduced yet", messageId: msg.messageId });
      return;
    }
    for (const room of socket.rooms) {
      socket.to(room).emit(SERVER_MESSAGES.control, { data: msg.data, user: data.username });
    }
    socket.emit(SERVER_MESSAGES.controlAck, { messageId: msg.messageId });
  });
}

function generateRoomId(): string {
  let id: string;
  do {
    id = randomBytes(16).toString('hex');
  } while (io.sockets.adapter.rooms.has(id));

  return id;
}
