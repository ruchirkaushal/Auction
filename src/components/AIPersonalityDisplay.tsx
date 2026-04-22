import React, { useMemo } from 'react';
import { Team, GameState } from '../types';

interface AIPersonalityDisplayProps {
  teams: Team[];
}

export const AIPersonalityDisplay: React.FC<AIPersonalityDisplayProps> = ({ teams }) => {
  const personalities = {
    aggressive: { name: '🔥 Aggressive', desc: 'High spender, targets stars', color: 'border-red-500/50 bg-red-500/10' },
    tactical: { name: '🎯 Tactical', desc: 'Balanced approach', color: 'border-blue-500/50 bg-blue-500/10' },
    conservative: { name: '💰 Conservative', desc: 'Budget-conscious', color: 'border-green-500/50 bg-green-500/10' }
  };

  const getPersonality = (teamId: string) => {
    const hash = teamId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const types = ['aggressive', 'tactical', 'conservative'] as const;
    return types[hash % types.length];
  };

  return (
    <div className="glass-panel p-4 space-y-3 text-sm">
      <h3 className="text-xs font-bebas tracking-widest text-white/40 uppercase mb-3">AI Types</h3>
      
      {teams
        .filter(t => t.isAI)
        .map(team => {
          const personality = getPersonality(team.id);
          const info = personalities[personality];
          return (
            <div 
              key={team.id}
              className={`p-2 rounded border ${info.color} flex items-center gap-2`}
            >
              <img src={team.logo} alt={team.id} className="w-5 h-5 object-contain" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs">{team.id}</p>
                <p className="text-[10px] text-white/60">{info.name}</p>
              </div>
            </div>
          );
        })}
    </div>
  );
};
