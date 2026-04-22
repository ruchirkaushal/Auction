import React, { useMemo } from 'react';
import { Team } from '../types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ComparisonViewProps {
  teams: Team[];
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ teams }) => {
  const formatPrice = (lakhs: number) => {
    if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(2)} Cr`;
    return `₹${lakhs} Lakhs`;
  };

  const stats = useMemo(() => {
    return teams.map(team => ({
      team,
      totalSpent: 12000 - team.purse,
      squadSize: team.squad.length,
      overseas: team.squad.filter(p => p.isOverseas).length,
      batters: team.squad.filter(p => p.role === 'Batter').length,
      allrounders: team.squad.filter(p => p.role === 'All-Rounder').length,
      bowlers: team.squad.filter(p => p.role.includes('Bowler')).length,
      wicketkeepers: team.squad.filter(p => p.role === 'Wicketkeeper').length,
      avgPrice: team.squad.length > 0 ? (12000 - team.purse) / team.squad.length : 0
    }));
  }, [teams]);

  const maxSquadSize = Math.max(...stats.map(s => s.squadSize), 1);
  const maxSpent = Math.max(...stats.map(s => s.totalSpent), 1);

  return (
    <div className="space-y-6">
      {/* Role Distribution Comparison */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bebas tracking-widest text-white/40 uppercase">Squad Role Distribution</h3>
        
        <div className="space-y-4">
          {stats.map(stat => (
            <div key={stat.team.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <img src={stat.team.logo} alt={stat.team.id} className="w-6 h-6 object-contain" />
                <span className="font-medium text-sm flex-1">{stat.team.id}</span>
                <span className="text-xs text-mi-secondary font-bebas">{stat.squadSize}/25</span>
              </div>

              <div className="grid grid-cols-5 gap-1 text-xs">
                <div className="bg-white/5 p-2 rounded text-center">
                  <p className="text-white/60 text-[10px]">WK</p>
                  <p className="font-bebas text-white">{stat.wicketkeepers}</p>
                </div>
                <div className="bg-white/5 p-2 rounded text-center">
                  <p className="text-white/60 text-[10px]">BAT</p>
                  <p className="font-bebas text-white">{stat.batters}</p>
                </div>
                <div className="bg-white/5 p-2 rounded text-center">
                  <p className="text-white/60 text-[10px]">AR</p>
                  <p className="font-bebas text-white">{stat.allrounders}</p>
                </div>
                <div className="bg-white/5 p-2 rounded text-center">
                  <p className="text-white/60 text-[10px]">BOWL</p>
                  <p className="font-bebas text-white">{stat.bowlers}</p>
                </div>
                <div className="bg-white/5 p-2 rounded text-center">
                  <p className="text-white/60 text-[10px]">OS</p>
                  <p className="font-bebas text-white">{stat.overseas}</p>
                </div>
              </div>

              {/* Squad Size Bar */}
              <div className="h-6 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-mi-secondary to-yellow-500 flex items-center justify-end pr-2"
                  style={{ width: `${(stat.squadSize / maxSquadSize) * 100}%` }}
                >
                  {stat.squadSize > 5 && <span className="text-[10px] font-bold text-white">{stat.squadSize}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Spending Analysis */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bebas tracking-widest text-white/40 uppercase">Spending Analysis</h3>

        <div className="space-y-3">
          {stats
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .map((stat, idx) => (
              <div key={stat.team.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-mi-secondary">#{idx + 1}</span>
                    <img src={stat.team.logo} alt={stat.team.id} className="w-5 h-5 object-contain" />
                    <span className="text-sm font-medium">{stat.team.id}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bebas text-white">{formatPrice(stat.totalSpent)}</p>
                    <p className="text-xs text-white/60">Avg: {formatPrice(stat.avgPrice)}</p>
                  </div>
                </div>

                {/* Spending Bar */}
                <div className="h-5 bg-gradient-to-r from-green-600 to-orange-600 rounded-full overflow-hidden relative" style={{ width: `${(stat.totalSpent / maxSpent) * 100}%` }}>
                  <div className="absolute inset-0 bg-black/20" />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bebas tracking-widest text-white/40 uppercase">Summary</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/5 p-4 rounded text-center">
            <p className="text-white/60 text-xs uppercase mb-1">Avg Squad Size</p>
            <p className="font-bebas text-2xl text-mi-secondary">
              {(stats.reduce((sum, s) => sum + s.squadSize, 0) / stats.length).toFixed(1)}
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded text-center">
            <p className="text-white/60 text-xs uppercase mb-1">Avg Price/Player</p>
            <p className="font-bebas text-2xl text-mi-secondary">
              {formatPrice(stats.reduce((sum, s) => sum + s.avgPrice, 0) / stats.length)}
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded text-center">
            <p className="text-white/60 text-xs uppercase mb-1">Total Overseas</p>
            <p className="font-bebas text-2xl text-mi-secondary">
              {stats.reduce((sum, s) => sum + s.overseas, 0)}/
              {Math.min(stats.length * 8, 80)}
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded text-center">
            <p className="text-white/60 text-xs uppercase mb-1">Remaining Budget</p>
            <p className="font-bebas text-2xl text-mi-secondary">
              {formatPrice(stats.reduce((sum, s) => sum + s.team.purse, 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
