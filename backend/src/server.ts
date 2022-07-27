import { Server, Socket } from 'socket.io';
import { CLIENT_MESSAGES } from './messages';

const io = new Server(3000);

io.on('connection', socket => setupSocket(socket));

function setupSocket(socket: Socket): void {
  socket.on(CLIENT_MESSAGES.new, () => {
    socket;
  });
}
