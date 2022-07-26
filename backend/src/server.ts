import { Server } from 'socket.io';

const io = new Server(8443, {
  cors: { origin: '*' },
});

io.on('connection', socket => {
  socket.emit('session_created', 42);
});
