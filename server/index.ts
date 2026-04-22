import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST']
}));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Types
interface RoomUser {
  socketId: string;
  userId: string;
  username: string;
  isHost: boolean;
  avatarUrl?: string; // Optional if we want cute avatars
  teamId?: string; // The selected team id for this user
}

interface AuctionState {
  isStarted: boolean;
  currentPlayerIndex: number;
  currentBid: number;
  highestBidderId: string | null;
  highestBidderName: string | null;
  timer: number;
  // Let's assume we fetch players from client side since there's a huge constants list, 
  // but we only track the index/sale events
}

interface Room {
  id: string;
  password?: string;
  users: Map<string, RoomUser>; // Map of socketId to RoomUser
  auctionState: AuctionState;
  timerInterval: NodeJS.Timeout | null;
  autoAdvanceTimeout: NodeJS.Timeout | null;
}

const rooms = new Map<string, Room>();

const emitRoomState = (roomId: string) => {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const usersList = Array.from(room.users.values());
  io.to(roomId).emit('room_state_update', {
    roomId: room.id,
    users: usersList,
    auctionState: room.auctionState
  });
};

io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // ------------- ROOM EVENTS -------------

  socket.on('create_room', (data: { userId: string; username: string; password?: string }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase(); // ABC123
    
    // Create room with default state
    const newRoom: Room = {
      id: roomId,
      password: data.password,
      users: new Map(),
      auctionState: {
        isStarted: false,
        currentPlayerIndex: 0,
        currentBid: 0,
        highestBidderId: null,
        highestBidderName: null,
        timer: 5,
      },
      timerInterval: null,
      autoAdvanceTimeout: null
    };

    // Add host user
    newRoom.users.set(socket.id, {
      socketId: socket.id,
      userId: data.userId,
      username: data.username,
      isHost: true
    });

    rooms.set(roomId, newRoom);
    socket.join(roomId);
    
    socket.emit('room_created', { roomId });
    emitRoomState(roomId);
  });

  socket.on('join_room', (data: { roomId: string; userId: string; username: string; password?: string }) => {
    const room = rooms.get(data.roomId);
    
    if (!room) {
      return socket.emit('error', 'Room not found');
    }

    if (room.password && room.password !== data.password) {
      return socket.emit('error', 'Invalid password');
    }

    // Check if user is already in the room with a different socket (reconnect)
    let isReturning = false;
    let oldTeamId: string | undefined;
    for (const [key, user] of room.users.entries()) {
      if (user.userId === data.userId) {
        oldTeamId = user.teamId;
        room.users.delete(key); // Remove old socket id entry
        isReturning = true;
      }
    }

    // Is there a host?
    const hasHost = Array.from(room.users.values()).some(u => u.isHost);

    const newUser: RoomUser = {
      socketId: socket.id,
      userId: data.userId,
      username: data.username,
      isHost: !hasHost, // Make host if no host exists
      teamId: oldTeamId
    };

    room.users.set(socket.id, newUser);
    socket.join(data.roomId);

    io.to(data.roomId).emit('player_joined', newUser);
    emitRoomState(data.roomId);
  });

  socket.on('leave_room', (data: { roomId: string }) => {
    handleUserLeave(socket, data.roomId);
  });

  socket.on('select_team', (data: { roomId: string, teamId: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;
    
    // Check if team is available
    const isOccupied = Array.from(room.users.values()).some(u => u.teamId === data.teamId && u.socketId !== socket.id);
    if (isOccupied) {
       return socket.emit('error', 'Team is already occupied by another player.');
    }

    const user = room.users.get(socket.id);
    if (user) {
      user.teamId = data.teamId;
      emitRoomState(data.roomId);
    }
  });

  socket.on('disconnect', () => {
    // Find rooms this socket is in
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        handleUserLeave(socket, roomId);
      }
    });
  });

  function handleUserLeave(socket: Socket, roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user) return;

    room.users.delete(socket.id);
    socket.leave(roomId);
    io.to(roomId).emit('player_left', user);

    // If room is empty, clean it up
    if (room.users.size === 0) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      rooms.delete(roomId);
    } else if (user.isHost) {
      // Transfer host to next person
      const nextHost = Array.from(room.users.values())[0];
      nextHost.isHost = true;
      io.to(roomId).emit('system_message', `${nextHost.username} is now the host.`);
    }
    
    emitRoomState(roomId);
  }

  // ------------- AUCTION EVENTS -------------

  socket.on('start_auction', (data: { roomId: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user || !user.isHost) return;

    room.auctionState.isStarted = true;
    room.auctionState.timer = 10;
    
    // Automatically start timer
    startTimer(data.roomId);
    
    emitRoomState(data.roomId);
  });

  socket.on('place_bid', (data: { roomId: string; bid: number }) => {
    const room = rooms.get(data.roomId);
    if (!room || !room.auctionState.isStarted) return;

    const user = room.users.get(socket.id);
    if (!user) return;

    if (data.bid > room.auctionState.currentBid) {
      room.auctionState.currentBid = data.bid;
      room.auctionState.highestBidderId = user.userId;
      room.auctionState.highestBidderName = user.username;
      room.auctionState.timer = 5; // Reset timer on bid
      
      // Clear any pending auto-advance
      if (room.autoAdvanceTimeout) {
        clearTimeout(room.autoAdvanceTimeout);
        room.autoAdvanceTimeout = null;
      }

      // Restart timer if it was cleared
      startTimer(data.roomId);

      emitRoomState(data.roomId);
      io.to(data.roomId).emit('bid_placed', {
        userId: user.userId,
        username: user.username,
        bid: data.bid
      });
    }
  });

  socket.on('next_player', (data: { roomId: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;

    // Clear any pending auto-advance
    if (room.autoAdvanceTimeout) {
      clearTimeout(room.autoAdvanceTimeout);
      room.autoAdvanceTimeout = null;
    }

    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }

    room.auctionState.currentPlayerIndex += 1;
    room.auctionState.currentBid = 0;
    room.auctionState.highestBidderId = null;
    room.auctionState.highestBidderName = null;
    room.auctionState.timer = 5;

    startTimer(data.roomId);
    emitRoomState(data.roomId);
  });

  function startTimer(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.timerInterval) {
      clearInterval(room.timerInterval);
    }

    room.timerInterval = setInterval(() => {
      if (room.auctionState.timer > 0) {
        room.auctionState.timer = Math.round((room.auctionState.timer - 0.1) * 10) / 10;
        io.to(roomId).emit('timer_update', { timer: room.auctionState.timer });
      } else {
        if (room.timerInterval) {
          clearInterval(room.timerInterval);
          room.timerInterval = null;
        }
        
        if (room.auctionState.highestBidderId) {
           io.to(roomId).emit('player_sold', {
             userId: room.auctionState.highestBidderId,
             username: room.auctionState.highestBidderName,
             amount: room.auctionState.currentBid
           });
        } else {
           io.to(roomId).emit('player_unsold');
        }

        // AUTO-ADVANCE AFTER 2.5 SECONDS
        if (room.autoAdvanceTimeout) clearTimeout(room.autoAdvanceTimeout);
        room.autoAdvanceTimeout = setTimeout(() => {
          const r = rooms.get(roomId);
          if (r && r.auctionState.isStarted) {
            r.auctionState.currentPlayerIndex += 1;
            r.auctionState.currentBid = 0;
            r.auctionState.highestBidderId = null;
            r.auctionState.highestBidderName = null;
            r.auctionState.timer = 5;
            startTimer(roomId);
            emitRoomState(roomId);
            r.autoAdvanceTimeout = null;
          }
        }, 2500); 
      }
    }, 100);
  }
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

const PORT = process.env.PORT || 3005;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO Server running on port ${PORT}`);
});
