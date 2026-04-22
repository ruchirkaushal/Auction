import React, { useMemo } from 'react';
import { GameState } from '../types';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface AuctionStatisticsProps {
  gameState: GameState;
}

export const AuctionStatistics: React.FC<AuctionStatisticsProps> = ({ gameState }) => {
  const formatPrice = (lakhs: number) => {
    if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(2)} Cr`;
    return `₹${lakhs} Lakhs`;
  };

  const stats = useMemo(() => {
    const soldPlayers = gameState.auctionHistory.filter(h => h.teamId);
    const unsoldPlayers = gameState.auctionHistory.filter(h => !h.teamId);
    
    const prices = soldPlayers.map(s => s.price);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    
    const totalSpent = prices.reduce((a, b) => a + b, 0);
    const auctionedCount = gameState.auctionHistory.length;
    const progressPercent = (auctionedCount / gameState.auctionQueue.length) * 100;

    // Price distribution by ranges
    const priceDistribution = {
      under100: prices.filter(p => p < 100).length,
      '100to500': prices.filter(p => p >= 100 && p < 500).length,
      '500to1000': prices.filter(p => p >= 500 && p < 1000).length,
      above1000: prices.filter(p => p >= 1000).length
    };

    // Most expensive players
    const mostExpensive = soldPlayers
      .map(h => {
        const player = gameState.auctionQueue.find(p => p.id === h.playerId);
        return { player, price: h.price, team: h.teamId };
      })
      .filter(item => item.player)
      .sort((a, b) => b.price - a.price)
      .slice(0, 5);

    return {
      soldPlayers: soldPlayers.length,
      unsoldPlayers: unsoldPlayers.length,
      auctionedCount,
      totalQueueLength: gameState.auctionQueue.length,
      progressPercent,
      avgPrice,
      minPrice,
      maxPrice,
      totalSpent,
      priceDistribution,
      mostExpensive
    };
  }, [gameState]);

  return (
    <div className="space-y-6">
      {/* Auction Progress */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-mi-secondary" />
          <h3 className="text-lg font-bebas tracking-widest text-white/40 uppercase">Auction Progress</h3>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">{stats.auctionedCount} / {stats.totalQueueLength} Players Auctioned</span>
            <span className="text-mi-secondary font-bebas">{stats.progressPercent.toFixed(1)}%</span>
          </div>

          <div className="h-4 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-mi-secondary to-yellow-500 transition-all duration-500"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/5 p-3 rounded text-center">
              <p className="text-xs text-white/60 uppercase mb-1">Sold</p>
              <p className="text-2xl font-bebas text-green-400">{stats.soldPlayers}</p>
            </div>
            <div className="bg-white/5 p-3 rounded text-center">
              <p className="text-xs text-white/60 uppercase mb-1">Unsold</p>
              <p className="text-2xl font-bebas text-red-400">{stats.unsoldPlayers}</p>
            </div>
            <div className="bg-white/5 p-3 rounded text-center">
              <p className="text-xs text-white/60 uppercase mb-1">Remaining</p>
              <p className="text-2xl font-bebas text-orange-400">
                {stats.totalQueueLength - stats.auctionedCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Price Statistics */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bebas tracking-widest text-white/40 uppercase">Price Statistics</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/5 p-4 rounded text-center border border-white/10">
            <p className="text-xs text-white/60 uppercase mb-2">Avg Price</p>
            <p className="text-xl font-bebas text-mi-secondary">{formatPrice(stats.avgPrice)}</p>
          </div>
          <div className="bg-white/5 p-4 rounded text-center border border-white/10">
            <p className="text-xs text-white/60 uppercase mb-2">Min Price</p>
            <p className="text-xl font-bebas text-green-400">{formatPrice(stats.minPrice)}</p>
          </div>
          <div className="bg-white/5 p-4 rounded text-center border border-white/10">
            <p className="text-xs text-white/60 uppercase mb-2">Max Price</p>
            <p className="text-xl font-bebas text-red-400">{formatPrice(stats.maxPrice)}</p>
          </div>
          <div className="bg-white/5 p-4 rounded text-center border border-white/10">
            <p className="text-xs text-white/60 uppercase mb-2">Total Spent</p>
            <p className="text-xl font-bebas text-mi-secondary">{formatPrice(stats.totalSpent)}</p>
          </div>
        </div>
      </div>

      {/* Price Distribution */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bebas tracking-widest text-white/40 uppercase">Price Distribution</h3>

        <div className="space-y-3">
          {[
            { label: 'Under ₹1 Cr', key: 'under100', color: 'from-blue-600', value: stats.priceDistribution.under100 },
            { label: '₹1-5 Cr', key: '100to500', color: 'from-green-600', value: stats.priceDistribution['100to500'] },
            { label: '₹5-10 Cr', key: '500to1000', color: 'from-orange-600', value: stats.priceDistribution['500to1000'] },
            { label: 'Above ₹10 Cr', key: 'above1000', color: 'from-red-600', value: stats.priceDistribution.above1000 }
          ].map(range => (
            <div key={range.key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">{range.label}</span>
                <span className="font-bebas text-white">{range.value}</span>
              </div>
              <div className="h-4 bg-white/5 rounded overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${range.color} to-yellow-500`}
                  style={{ width: `${stats.soldPlayers > 0 ? (range.value / stats.soldPlayers) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 Most Expensive */}
      {stats.mostExpensive.length > 0 && (
        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-lg font-bebas tracking-widest text-white/40 uppercase flex items-center gap-2">
            <TrendingUp size={18} className="text-red-500" />
            Top 5 Most Expensive Players
          </h3>

          <div className="space-y-2">
            {stats.mostExpensive.map((item, idx) => (
              <div
                key={item.player?.id}
                className="bg-white/5 p-3 rounded border border-white/10 flex items-center justify-between hover:bg-white/10 transition"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-center w-8">
                    <span className="text-sm font-bebas text-red-500 font-bold">#{idx + 1}</span>
                  </div>
                  <img 
                    src={item.player?.photo} 
                    onError={(e) => { e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'; }}
                    alt={item.player?.name} 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.player?.name}</p>
                    <p className="text-xs text-white/50">{item.player?.role}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <img 
                    src={gameState.teams.find(t => t.id === item.team)?.logo}
                    alt="Team"
                    className="w-5 h-5 object-contain mb-1"
                  />
                  <p className="text-sm font-bebas text-red-400">{formatPrice(item.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
