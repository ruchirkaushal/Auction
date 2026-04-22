import React, { useState, useMemo } from 'react';
import { Team } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, ChevronRight, Zap } from 'lucide-react';

interface TournamentMode {
  mode: 'knockout' | 'league';
  teamsCount: number;
}

interface Match {
  id: string;
  team1?: Team;
  team2?: Team;
  winner?: Team;
  round: number;
  locked: boolean;
}

interface TournamentBracketProps {
  teams: Team[];
  onMatchComplete?: (match: Match) => void;
}

export const TournamentBracket: React.FC<TournamentBracketProps> = ({ teams, onMatchComplete }) => {
  const [mode, setMode] = useState<'knockout' | 'league'>('knockout');
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [results, setResults] = useState<Map<string, Team>>(new Map());

  // Generate knockout bracket
  const bracket = useMemo(() => {
    if (teams.length < 2) return [];
    
    const matches: Match[] = [];
    let matchId = 0;
    
    // First round - pair adjacent teams
    const firstRound = Math.ceil(teams.length / 2);
    for (let i = 0; i < firstRound; i++) {
      matches.push({
        id: `match-${matchId++}`,
        team1: teams[i * 2],
        team2: teams[i * 2 + 1],
        round: 1,
        locked: false
      });
    }
    
    // Subsequent rounds
    let currentRound = 1;
    let processedMatches = firstRound;
    
    while (processedMatches > 1) {
      const nextRound = Math.ceil(processedMatches / 2);
      currentRound++;
      
      for (let i = 0; i < nextRound; i++) {
        matches.push({
          id: `match-${matchId++}`,
          round: currentRound,
          locked: false
        });
      }
      
      processedMatches = nextRound;
    }
    
    return matches;
  }, [teams, mode]);

  const decideWinner = (matchId: string, winner: Team) => {
    setResults(new Map(results).set(matchId, winner));
    
    const match = bracket.find(m => m.id === matchId);
    if (match && onMatchComplete) {
      onMatchComplete({ ...match, winner });
    }
    
    setSelectedMatch(null);
  };

  const roundMatches = useMemo(() => {
    const grouped: Record<number, Match[]> = {};
    bracket.forEach(match => {
      if (!grouped[match.round]) grouped[match.round] = [];
      grouped[match.round].push(match);
    });
    return grouped as Record<number, Match[]>;
  }, [bracket]);

  const getFinalWinner = (): Team | null => {
    const finalRound = Math.max(...Object.keys(roundMatches).map(Number));
    const finalMatches = roundMatches[finalRound] || [];
    return finalMatches[0] ? results.get(finalMatches[0].id) || null : null;
  };

  return (
    <div className="space-y-6">
      {/* MODE SELECTOR */}
      <div className="flex gap-4">
        <button
          onClick={() => setMode('knockout')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            mode === 'knockout'
              ? 'bg-mi-secondary text-mi-primary'
              : 'bg-white/10 text-white/60 hover:bg-white/20'
          }`}
        >
          🏆 Knockout
        </button>
        <button
          onClick={() => setMode('league')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            mode === 'league'
              ? 'bg-mi-secondary text-mi-primary'
              : 'bg-white/10 text-white/60 hover:bg-white/20'
          }`}
        >
          📊 League
        </button>
      </div>

      {/* TOURNAMENT INFO */}
      <div className="glass-panel p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-white/60 text-sm">Participating Teams</span>
          <span className="font-bebas text-2xl text-mi-secondary">{teams.length}</span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-mi-secondary transition-all"
            style={{ width: `${(results.size / bracket.length) * 100 || 0}%` }}
          />
        </div>
        <div className="text-[10px] text-white/40">
          Matches Completed: {results.size} / {bracket.length}
        </div>
      </div>

      {/* BRACKET VISUALIZATION */}
      <div className="space-y-6 overflow-x-auto pb-4">
        {Object.entries(roundMatches)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([roundNum, matches]: [string, Match[]]) => (
            <div key={roundNum} className="space-y-3">
              <h3 className="text-xs font-bebas text-white/60 uppercase tracking-widest">
                Round {roundNum}
                {matches.length === 1 && ' - FINAL'}
              </h3>
              <div className="space-y-2">
                <AnimatePresence>
                  {matches.map((match, idx) => {
                    const winner = results.get(match.id);
                    return (
                      <motion.button
                        key={match.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => setSelectedMatch(match.id)}
                        className={`w-full p-4 rounded-lg transition-all ${
                          winner
                            ? 'glass-panel border-green-500/50 bg-green-500/10'
                            : 'glass-panel hover:border-mi-secondary/50 border border-white/20'
                        }`}
                      >
                        <div className="space-y-2">
                          {/* Team 1 */}
                          <div
                            className={`flex items-center justify-between p-2 rounded ${
                              winner?.id === match.team1?.id ? 'bg-green-500/20' : 'bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {match.team1?.logo && (
                                <img src={match.team1.logo} className="w-6 h-6 object-contain" />
                              )}
                              <span className="text-sm font-medium">
                                {match.team1?.name || 'TBD'}
                              </span>
                            </div>
                            {winner?.id === match.team1?.id && <Trophy size={16} className="text-green-500" />}
                          </div>

                          {/* Separator */}
                          <div className="relative h-1 bg-white/10">
                            <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2 bg-white/20 px-2 py-1 rounded text-[8px] text-white/60">
                              vs
                            </div>
                          </div>

                          {/* Team 2 */}
                          <div
                            className={`flex items-center justify-between p-2 rounded ${
                              winner?.id === match.team2?.id ? 'bg-green-500/20' : 'bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {match.team2?.logo && (
                                <img src={match.team2.logo} className="w-6 h-6 object-contain" />
                              )}
                              <span className="text-sm font-medium">
                                {match.team2?.name || 'TBD'}
                              </span>
                            </div>
                            {winner?.id === match.team2?.id && <Trophy size={16} className="text-green-500" />}
                          </div>
                        </div>

                        {/* STATUS */}
                        {!winner && (
                          <div className="mt-3 flex items-center justify-center gap-2 text-mi-secondary text-xs font-bold">
                            <Zap size={14} />
                            Click to decide winner
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
      </div>

      {/* WINNER SELECTION MODAL */}
      <AnimatePresence>
        {selectedMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel p-6 max-w-sm w-full space-y-4"
            >
              <h3 className="text-lg font-bebas text-mi-secondary">Declare Winner</h3>
              {bracket.find(m => m.id === selectedMatch) && (
                <>
                  {(() => {
                    const match = bracket.find(m => m.id === selectedMatch)!;
                    return (
                      <>
                        {match.team1 && (
                          <button
                            onClick={() => decideWinner(selectedMatch, match.team1!)}
                            className="w-full p-4 bg-white/10 hover:bg-mi-secondary/30 rounded-lg flex items-center gap-3 transition-all group"
                          >
                            <img src={match.team1.logo} className="w-8 h-8 object-contain" />
                            <span className="text-sm font-bold flex-1">{match.team1.name}</span>
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                        )}
                        {match.team2 && (
                          <button
                            onClick={() => decideWinner(selectedMatch, match.team2!)}
                            className="w-full p-4 bg-white/10 hover:bg-mi-secondary/30 rounded-lg flex items-center gap-3 transition-all group"
                          >
                            <img src={match.team2.logo} className="w-8 h-8 object-contain" />
                            <span className="text-sm font-bold flex-1">{match.team2.name}</span>
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                        )}
                      </>
                    );
                  })()}
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOURNAMENT WINNER */}
      {getFinalWinner() && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-6 text-center space-y-3 border border-green-500/50 bg-green-500/10"
        >
          <Trophy size={32} className="mx-auto text-mi-secondary" />
          <h2 className="text-2xl font-bebas text-mi-secondary">Tournament Winner!</h2>
          <div className="flex items-center justify-center gap-4">
            <img src={getFinalWinner()!.logo} className="w-12 h-12 object-contain" />
            <p className="text-xl font-bold">{getFinalWinner()!.name}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};
