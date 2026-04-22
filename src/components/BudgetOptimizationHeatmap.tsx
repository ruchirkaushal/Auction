import React, { useMemo } from 'react';
import { Team } from '../types';

interface BudgetHeatmapProps {
  teams: Team[];
}

export const BudgetOptimizationHeatmap: React.FC<BudgetHeatmapProps> = ({ teams }) => {
  const formatPrice = (lakhs: number) => {
    if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(2)} Cr`;
    return `₹${lakhs} Lakhs`;
  };

  const budgetStats = useMemo(() => {
    return teams.map(team => {
      const totalSpent = 12000 - team.purse; // Initial purse was 12000
      const spentPercentage = (totalSpent / 12000) * 100;
      const avgPerPlayer = team.squad.length > 0 ? totalSpent / team.squad.length : 0;
      return {
        team,
        totalSpent,
        spentPercentage,
        avgPerPlayer,
        remainingPurse: team.purse
      };
    });
  }, [teams]);

  // Calculate max and min for scaling
  const maxSpent = Math.max(...budgetStats.map(s => s.totalSpent), 1);
  const percentageToIntensity = (spent: number) => {
    const normalized = spent / maxSpent;
    if (normalized > 0.75) return 'from-red-600 to-red-500';
    if (normalized > 0.5) return 'from-orange-600 to-orange-500';
    if (normalized > 0.25) return 'from-yellow-600 to-yellow-500';
    return 'from-green-600 to-green-500';
  };

  return (
    <div className="glass-panel p-4 sm:p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-bebas tracking-widest text-white/40 uppercase">Budget Optimization</h3>
        <p className="text-xs text-white/50">Spending intensity visualization for smart budget allocation</p>
      </div>

      <div className="space-y-3">
        {budgetStats.map(stat => (
          <div key={stat.team.id} className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <img src={stat.team.logo} alt={stat.team.id} className="w-5 h-5 object-contain" />
                <span className="font-medium truncate">{stat.team.id}</span>
              </div>
              <div className="text-right">
                <p className="font-bebas text-mi-secondary text-sm">{stat.spentPercentage.toFixed(1)}%</p>
                <p className="text-white/40 text-[10px]">{formatPrice(stat.totalSpent)} spent</p>
              </div>
            </div>

            {/* Heatmap Bar */}
            <div className="h-6 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full bg-gradient-to-r ${percentageToIntensity(stat.totalSpent)} transition-all duration-300 flex items-center justify-end pr-2`}
                style={{ width: `${Math.min(stat.spentPercentage, 100)}%` }}
              >
                {stat.spentPercentage > 15 && (
                  <span className="text-[10px] font-bold text-white drop-shadow-sm">
                    {stat.spentPercentage.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-3 gap-2 text-[9px] text-white/50">
              <div>
                <p className="uppercase text-[8px]">Avg/Player</p>
                <p className="text-white font-bebas">{formatPrice(stat.avgPerPlayer)}</p>
              </div>
              <div>
                <p className="uppercase text-[8px]">Squad</p>
                <p className="text-white font-bebas">{stat.team.squad.length}/25</p>
              </div>
              <div>
                <p className="uppercase text-[8px]">Remaining</p>
                <p className="text-white font-bebas">{formatPrice(stat.remainingPurse)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/10 text-[9px]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-green-600 to-green-500" />
          <span className="text-white/60">0-25%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-yellow-600 to-yellow-500" />
          <span className="text-white/60">25-50%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-orange-600 to-orange-500" />
          <span className="text-white/60">50-75%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-red-600 to-red-500" />
          <span className="text-white/60">75-100%</span>
        </div>
      </div>
    </div>
  );
};
