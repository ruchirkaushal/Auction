import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { socket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';
import { Users2, ArrowRight, ArrowLeft, Globe } from 'lucide-react';
import { GameState } from '../types';
import { TEAMS_DATA } from '../constants';
import { SORTED_PLAYERS } from '../App';

interface MultiplayerLobbyProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ gameState, setGameState }) => {
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [roomId, setRoomInput] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [view, setView] = useState<'menu' | 'create' | 'join'>('menu');
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [password, setPassword] = useState('');
  
  const { isOnline, roomId: stateRoomId, isHost, onlineUserId } = gameState;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomInput(roomParam);
      setView('join');
    }
  }, []);


  const userId = React.useMemo(() => {
    let id = localStorage.getItem('userId');
    if (!id) {
      id = Math.random().toString(36).substring(2, 9);
      localStorage.setItem('userId', id);
    }
    return id;
  }, []);

  useEffect(() => {
    if (username) {
      localStorage.setItem('username', username);
    }
  }, [username]);

  useEffect(() => {
    socket.connect();
    
    socket.on('room_created', (data) => {
      setGameState(prev => ({ ...prev, roomId: data.roomId, isOnline: true, isHost: true }));
      setIsJoined(true);
    });

    socket.on('player_joined', (user) => {
      // Could notify user joined
    });

    socket.on('error', (msg) => {
      setError(msg);
      setIsJoined(false);
    });

    socket.on('room_state_update', (state) => {
      const me = state.users.find((u: any) => u.userId === userId);
      setGameState(prev => ({
        ...prev,
        roomId: state.roomId,
        isOnline: true,
        onlineUsers: state.users,
        isHost: me?.isHost || false,
        onlineUserId: userId
      }));
      setIsJoined(true);
      
      if (state.auctionState.isStarted && gameState.step !== 'auction') {
        const users = state.users;
        const finalTeams = TEAMS_DATA.map((t) => {
           const humanReg = users.find((u: any) => u.teamId === t.id);
           return {
             ...t,
             purse: 12000,
             squad: [],
             isAI: !humanReg,
             ownerName: humanReg ? humanReg.username : 'AI Manager',
             id: humanReg ? humanReg.userId : t.id // Map team id to userId
           };
        });
        setGameState(prev => ({ 
             ...prev, 
             step: 'auction', 
             teams: finalTeams,
             currentPlayerIndex: 0,
             currentBid: 0,
             highestBidderId: null,
             timer: 10,
             auctionHistory: [],
             passedTeams: [],
             players: SORTED_PLAYERS,
             auctionQueue: [...SORTED_PLAYERS]
        }));
      }
    });

    return () => {
      socket.off('room_created');
      socket.off('player_joined');
      socket.off('error');
      socket.off('room_state_update');
    };
  }, []);

  const handleCreateRoom = () => {
    if (!username.trim()) return setError('Username is required');
    setError('');
    socket.emit('create_room', { userId, username, password });
  };

  const handleJoinRoom = () => {
    if (!username.trim()) return setError('Username is required');
    if (!roomId.trim()) return setError('Room ID is required');
    setError('');
    socket.emit('join_room', { roomId: roomId.toUpperCase(), userId, username, password });
  };

  const copyInviteLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', stateRoomId!);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const startOnlineAuction = () => {
     if (isHost && stateRoomId) {
        socket.emit('start_auction', { roomId: stateRoomId });
     }
  };

  if (isJoined && stateRoomId) {
    const users: any[] = gameState.onlineUsers || [];
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel max-w-3xl w-full p-8 sm:p-10 space-y-8 relative pt-16 sm:pt-10">
          <button onClick={() => {
             socket.emit('leave_room', { roomId: stateRoomId });
             setGameState(prev => ({ ...prev, step: 'mode_select', isOnline: false, roomId: undefined, onlineUsers: undefined }));
             setIsJoined(false);
          }} className="text-white/40 hover:text-white flex items-center gap-1 text-sm absolute top-6 left-6 transition-colors">
            <ArrowLeft size={16} /> Leave Room
          </button>

          <div className="flex justify-between items-center border-b border-white/10 pb-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bebas text-mi-secondary">Room Lobby</h2>
              <p className="text-xs text-white/50 uppercase tracking-widest mt-1">ID: <span className="text-white font-mono text-lg ml-2 select-all">{stateRoomId}</span></p>
            </div>
            {isHost && (
              <span className="bg-red-500/20 text-red-500 border border-red-500/50 px-3 py-1 rounded-full text-[10px] uppercase font-bold animate-pulse">You are Host</span>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center animate-pulse">
              {error}
            </div>
          )}

          <div className="flex gap-2 mb-6">
            <button 
              onClick={copyInviteLink} 
              className={`flex-1 border py-2 rounded text-sm uppercase tracking-wider font-medium transition-all text-center ${copiedLink ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'}`}
            >
              {copiedLink ? 'Copied to Clipboard!' : 'Copy Invite Link'}
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white/70 uppercase">Select Your Franchise</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {TEAMS_DATA.map(team => {
                const occupant = users.find(u => u.teamId === team.id);
                const isMyTeam = occupant?.userId === userId;
                return (
                  <button 
                    key={team.id}
                    disabled={!!occupant && !isMyTeam}
                    onClick={() => socket.emit('select_team', { roomId: stateRoomId, teamId: team.id })}
                    className={`relative p-3 border rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${isMyTeam ? 'border-mi-secondary bg-mi-secondary/20 shadow-[0_0_15px_rgba(255,203,5,0.3)]' : occupant ? 'border-red-500/50 bg-red-500/10 opacity-50 cursor-not-allowed' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                  >
                    <img src={team.logo} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" alt={team.name} />
                    <span className="text-[10px] font-bold text-center leading-tight truncate w-full">{team.name}</span>
                    {occupant && <div className="absolute -top-3 -right-2 bg-black border border-white/20 text-[10px] px-2 py-0.5 rounded-full text-white/90 truncate max-w-[80px]">{occupant.username}</div>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-white/10">
             {isHost ? (
               <button 
                 onClick={() => {
                   const allSelected = users.every(u => !!u.teamId);
                   if (!allSelected) {
                     setError('All players must select a team before starting.');
                     setTimeout(() => setError(''), 3000);
                     return;
                   }
                   startOnlineAuction();
                 }} 
                 className="w-full bg-mi-secondary text-mi-primary font-bebas text-2xl py-4 rounded-lg active:scale-95 transition-all"
               >
                 START AUCTION NOW
               </button>
            ) : (
               <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
                 <p className="text-white/60 uppercase tracking-widest text-sm animate-pulse">Waiting for host to start...</p>
               </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Pre-join menus
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel max-w-md w-full p-6 sm:p-8 space-y-6">
        <button onClick={() => setGameState(prev => ({ ...prev, step: 'mode_select' }))} className="text-white/40 hover:text-white flex items-center gap-1 text-sm absolute top-6 left-6">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="text-center space-y-2 pt-6">
          <Globe className="w-12 h-12 text-mi-secondary mx-auto mb-4" />
          <h2 className="text-3xl font-bebas text-mi-secondary">ONLINE MULTIPLAYER</h2>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Connect with friends, build your squad</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <label className="block text-sm font-medium text-white/70">Your Username</label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg p-3 outline-none focus:border-mi-secondary"
            placeholder="e.g. MS Dhoni"
          />
        </div>

        {view === 'menu' && (
          <div className="grid grid-cols-2 gap-4 mt-8">
             <button onClick={() => setView('create')} className="bg-mi-secondary text-mi-primary font-bebas text-xl py-3 auto-cols-auto rounded-lg">Create Room</button>
             <button onClick={() => setView('join')} className="bg-white/10 text-white font-bebas border border-white/20 text-xl py-3 auto-cols-auto rounded-lg">Join Room</button>
          </div>
        )}

        {view === 'create' && (
           <div className="mt-8 space-y-4">
             <div>
               <label className="block text-sm font-medium text-white/70 mb-1">Room Password (Optional)</label>
               <input 
                 type="password" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full bg-white/10 border border-white/20 rounded-lg p-3 outline-none focus:border-mi-secondary"
                 placeholder="Leave blank for public room"
               />
             </div>
             <button onClick={handleCreateRoom} className="w-full bg-mi-secondary text-mi-primary font-bebas text-xl py-3 rounded-lg flex items-center justify-center gap-2">
               Generate New Room <ArrowRight size={20} />
             </button>
             <button onClick={() => setView('menu')} className="w-full text-white/40 text-xs text-center">Cancel</button>
           </div>
        )}

        {view === 'join' && (
           <div className="mt-8 space-y-4">
             <div>
               <label className="block text-xs uppercase text-white/60 mb-2">Room ID</label>
               <input 
                  type="text" 
                  value={roomId}
                  onChange={(e) => setRoomInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-lg p-3 outline-none focus:border-mi-secondary font-mono tracking-widest uppercase mb-3"
                  placeholder="ABC123"
                  maxLength={6}
               />
               <label className="block text-sm font-medium text-white/70 mb-1">Room Password (Optional)</label>
               <input 
                 type="password" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full bg-white/10 border border-white/20 rounded-lg p-3 outline-none focus:border-mi-secondary"
                 placeholder="Enter password if required"
               />
             </div>
             <button onClick={handleJoinRoom} className="w-full bg-mi-secondary text-mi-primary font-bebas text-xl py-3 rounded-lg flex items-center justify-center gap-2">
               Connect to Room <ArrowRight size={20} />
             </button>
             <button onClick={() => setView('menu')} className="w-full text-white/40 text-xs text-center">Cancel</button>
           </div>
        )}
      </motion.div>
    </div>
  );
};
