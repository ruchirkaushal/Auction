import { io } from 'socket.io-client';
// @ts-ignore
const SOCKET_URL = import.meta.env?.VITE_SOCKET_URL || 'http://localhost:3005';

export const socket = io(SOCKET_URL, {
  autoConnect: false, // Connect only when entering multiplayer
});
