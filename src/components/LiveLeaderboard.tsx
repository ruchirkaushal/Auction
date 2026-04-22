import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp } from 'lucide-react';
import { Team, GameState } from '../types';

interface LeaderboardEntry {
  timestamp: number;
  playerName: string;
  playerOverseas: boolean;
  teamId: string;
  teamName: string;
  price: number;
  status: 'bid' | 'sold' | 'unsold';
}

interface LiveLeaderboardProps {
  gameState: GameState;
  maxEntries?: number;
}

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({ gameState, maxEntries = 8 }) => {
  const formatPrice = (lakhs: number) => {
    if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(2)} Cr`;
    return `₹${lakhs} Lakhs`;
  };

  // Generate leaderboard entries from auction history + current bid
  const leaderboardEntries = useMemo(() => {
    const entries: LeaderboardEntry[] = [];
    const currentPlayer = gameState.auctionQueue[gameState.currentPlayerIndex];

    // Add history entries
    gameState.auctionHistory.forEach((entry, idx) => {
      const player = gameState.auctionQueue.find(p => p.id === entry.playerId);
      if (player) {
        entries.push({
          timestamp: idx,
          playerName: player.name,
          playerOverseas: player.isOverseas,
          teamId: entry.teamId,
          teamName: entry.teamId
            ? gameState.teams.find(t => t.id === entry.teamId)?.name || 'Unknown'
            : 'Unsold',
          price: entry.price,
          status: entry.teamId ? 'sold' : 'unsold'
        });
      }
    });

    // Add current bid if active
    if (gameState.currentBid > 0 && gameState.highestBidderId && currentPlayer) {
      entries.push({
        timestamp: gameState.auctionHistory.length,
        playerName: currentPlayer.name,
        playerOverseas: currentPlayer.isOverseas,
        teamId: gameState.highestBidderId,
        teamName:
          gameState.teams.find(t => t.id === gameState.highestBidderId)?.name || 'Unknown',
        price: gameState.currentBid,
        status: 'bid'
      });
    }

    // Return last N entries in reverse order (newest first)
    return entries.slice(-maxEntries).reverse();
  }, [gameState, maxEntries]);

  return (
    <div className="glass-panel p-4 sm:p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-2">
        <TrendingUp size={18} className="text-mi-secondary" />
        <h3 className="text-sm font-bebas tracking-widest text-white/40 uppercase">Live Leaderboard</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        <AnimatePresence mode="popLayout">
          {leaderboardEntries.map((entry, idx) => (
            <motion.div
              key={`${entry.timestamp}-${entry.playerName}`}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`flex items-center gap-2 p-2 sm:p-3 rounded-lg border transition-all ${
                entry.status === 'bid'
                  ? 'bg-yellow-500/10 border-yellow-500/30 animate-pulse'
                  : entry.status === 'sold'
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              {/* Status Indicator */}
              <div className="w-2 h-2 rounded-full shrink-0 flex-col items-center justify-center">
                <div
                  className={`w-2 h-2 rounded-full ${
                    entry.status === 'bid'
                      ? 'bg-yellow-500 animate-pulse'
                      : entry.status === 'sold'
                        ? 'bg-green-500'
                        : 'bg-red-500'
                  }`}
                />
              </div>

              {/* Team Logo */}
              {entry.status !== 'unsold' && (
                <img
                  src={gameState.teams.find(t => t.id === entry.teamId)?.logo}
                  alt={entry.teamName}
                  className="w-6 h-6 object-contain"
                />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-bold truncate max-w-[120px] sm:max-w-none">
                  {entry.playerName}
                  {entry.playerOverseas && ' ✈️'}
                </p>
                <p className="text-[8px] sm:text-[10px] text-white/50 truncate">
                  {entry.status === 'unsold' ? 'Unsold' : entry.teamName}
                </p>
              </div>

              {/* Price */}
              <div className="text-right shrink-0">
                <p className="text-[10px] sm:text-xs font-bebas text-mi-secondary">
                  {formatPrice(entry.price)}
                </p>
                <p className="text-[7px] sm:text-[9px] text-white/40 uppercase">
                  {entry.status === 'bid' ? 'Bidding' : entry.status === 'sold' ? 'Sold' : 'Unsold'}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {leaderboardEntries.length === 0 && (
          <div className="flex items-center justify-center h-24 text-white/30 text-sm italic">
            Waiting for bids...
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-[10px]">
        <div className="bg-white/5 p-2 rounded text-center">
          <p className="text-white font-bebas text-xs">{gameState.auctionHistory.length}</p>
          <p className="text-white/40">Sold</p>
        </div>
        <div className="bg-white/5 p-2 rounded text-center">
          <p className="text-white font-bebas text-xs">
            {gameState.auctionHistory.filter(h => !h.teamId).length}
          </p>
          <p className="text-white/40">Unsold</p>
        </div>
      </div>
    </div>
  );
};
