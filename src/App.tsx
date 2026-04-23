import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Wallet, 
  Menu,
  X,
  Plus,
  ArrowRight,
  RefreshCw,
  Trophy,
  Users2,
  List,
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  BarChart3,
  Columns3,
  Compass,
  LogOut,
  UserPlus,
  Volume2,
  VolumeX,
  Pause,
  ChevronRight,
  Globe,
  ArrowLeft
} from 'lucide-react';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { socket } from './lib/socket';
import { Team, Player, AuctionedPlayer, GameState, Role } from './types';
import { TEAMS_DATA, ALL_PLAYERS } from './constants';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LiveLeaderboard } from './components/LiveLeaderboard';
import { FilteredSquadViewer } from './components/FilteredSquadViewer';
import { BudgetOptimizationHeatmap } from './components/BudgetOptimizationHeatmap';
import { ComparisonView } from './components/ComparisonView';
import { AuctionStatistics } from './components/AuctionStatistics';
import { PlayerDiscovery } from './components/PlayerDiscovery';
import { TournamentBracket } from './components/TournamentBracket';
import { SoundEffects } from './utils/soundEffects';
import { LocalStorageManager } from './utils/localStorage';

const INITIAL_PURSE = 12000; // 120 Crore in Lakhs

// --- AI PERSONALITY SYSTEM ---
type AIPersonalityType = 'aggressive' | 'tactical' | 'conservative';

const getAIPersonality = (teamId: string): AIPersonalityType => {
  const hash = teamId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const types: AIPersonalityType[] = ['aggressive', 'tactical', 'conservative'];
  return types[hash % types.length];
};

const getPersonalityMultipliers = (personality: AIPersonalityType) => {
  switch(personality) {
    case 'aggressive':
      return { baseFactorMult: 1.4, maxBidMult: 1.5, bidChanceMult: 1.1 };
    case 'tactical':
      return { baseFactorMult: 1.0, maxBidMult: 1.0, bidChanceMult: 1.0 };
    case 'conservative':
      return { baseFactorMult: 0.7, maxBidMult: 0.8, bidChanceMult: 0.8 };
  }
};

// --- TEAM COMPOSITION ANALYZER ---
const getTeamStats = (team: Team) => {
  const stats = {
    counts: {
      Batter: 0,
      Wicketkeeper: 0,
      'All-Rounder': 0,
      'Fast Bowler': 0,
      'Spin Bowler': 0
    },
    stars: {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    },
    tier1Spend: 0,
    overseasSpend: 0,
    totalPlayers: team.squad.length,
    overseasCount: team.squad.filter(p => p.isOverseas).length,
    overseasRoles: {
      Batter: 0,
      Wicketkeeper: 0,
      'All-Rounder': 0,
      'Fast Bowler': 0,
      'Spin Bowler': 0
    }
  };
  
  team.squad.forEach(p => {
    stats.counts[p.role]++;
    stats.stars[p.starRating]++;
    if (p.starRating === 5) stats.tier1Spend += p.pricePaid;
    if (p.isOverseas) {
      stats.overseasSpend += p.pricePaid;
      stats.overseasRoles[p.role]++;
    }
  });
  
  return stats;
};

// --- AUCTION SET CALCULATOR ---
const getPlayerSet = (player: Player) => {
  const roleName = player.role === 'Fast Bowler' || player.role === 'Spin Bowler' ? 'Bowlers' : 
                   player.role === 'Wicketkeeper' ? 'Wicketkeepers' : 
                   player.role === 'Batter' ? 'Batters' : 'All-Rounders';
                   
  if (player.starRating === 5) return `Marquee Set: ${roleName}`;
  if (player.starRating === 4) return `Capped Set: ${roleName}`;
  if (player.starRating === 3) return `Utility Set: ${roleName}`;
  if (player.starRating === 2) return `Uncapped Set: ${roleName}`;
  return `Squad Depth: ${roleName}`;
};

export const SORTED_PLAYERS = [...ALL_PLAYERS].sort((a, b) => {
  // 1. Star Rating (Descending)
  if (b.starRating !== a.starRating) return b.starRating - a.starRating;
  
  // 2. Role Priority (Ascending)
  const rolePriority: Record<Role, number> = {
    'Batter': 1,
    'Wicketkeeper': 2,
    'All-Rounder': 3,
    'Fast Bowler': 4,
    'Spin Bowler': 5,
  };
  if (rolePriority[a.role] !== rolePriority[b.role]) return rolePriority[a.role] - rolePriority[b.role];
  
  // 3. Name stability
  return a.name.localeCompare(b.name);
});

function AppContent() {
  const [gameState, setGameState] = useState<GameState>(() => {
    return {
      step: 'mode_select',
      teams: [],
      players: SORTED_PLAYERS,
      auctionQueue: [...SORTED_PLAYERS],
      currentPlayerIndex: 0,
      currentBid: 0,
      highestBidderId: null,
      timer: 5,
      isPaused: false,
      auctionHistory: [],
      activeTab: 'auction',
      passedTeams: [],
      soundEnabled: LocalStorageManager.isSoundEnabled(),
      priceHistory: []
    };
  });

  // Ensure currentPlayer is always safe
  const currentPlayer = useMemo(() => {
    const queue = gameState.auctionQueue || SORTED_PLAYERS;
    return queue[gameState.currentPlayerIndex] || queue[0];
  }, [gameState.auctionQueue, gameState.currentPlayerIndex]);

  const [showFullPlayerList, setShowFullPlayerList] = useState(false);
  const [numHumans, setNumHumans] = useState(1);
  const [humanRegistrations, setHumanRegistrations] = useState<{ name: string; teamId: string }[]>([]);
  const [currentRegIndex, setCurrentRegIndex] = useState(0);
  const [showSoldBanner, setShowSoldBanner] = useState<string | null>(null);
  const [showSquadModal, setShowSquadModal] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(gameState.soundEnabled ?? true);
  const [bidCount, setBidCount] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const aiBidRef = useRef<NodeJS.Timeout | null>(null);

  // Persist game state to localStorage
  useEffect(() => {
    if (gameState.step === 'auction' || gameState.step === 'summary') {
      LocalStorageManager.saveGameState(gameState);
    }
  }, [gameState]);

  // Persist sound setting
  useEffect(() => {
    LocalStorageManager.setSoundEnabled(soundEnabled);
    setGameState(prev => ({ ...prev, soundEnabled }));
  }, [soundEnabled]);


  const humanTeam = useMemo(() => 
    gameState.teams.find(t => !t.isAI), 
    [gameState.teams]
  );

  // --- REGISTRATION LOGIC ---
  const handleStartRegistration = () => {
    setHumanRegistrations(Array(numHumans).fill(null).map(() => ({ name: '', teamId: '' })));
    setCurrentRegIndex(0);
  };

  const handleRegisterHuman = (name: string, teamId: string) => {
    const updated = [...humanRegistrations];
    updated[currentRegIndex] = { name, teamId };
    setHumanRegistrations(updated);
    if (currentRegIndex < numHumans - 1) {
      setCurrentRegIndex(prev => prev + 1);
    }
  };

  const finalizeTeams = () => {
    const humanTeamIds = humanRegistrations.map(r => r.teamId);
    const finalTeams: Team[] = TEAMS_DATA.map(t => {
      const humanReg = humanRegistrations.find(r => r.teamId === t.id);
      return {
        ...t,
        purse: INITIAL_PURSE,
        squad: [],
        isAI: !humanReg,
        ownerName: humanReg ? humanReg.name : 'AI Manager'
      };
    });
    setGameState(prev => ({ 
      ...prev, 
      teams: finalTeams, 
      step: 'auction',
      currentPlayerIndex: 0,
      currentBid: 0,
      highestBidderId: null,
      timer: 5,
      isPaused: false,
      auctionHistory: [],
      passedTeams: [],
      activeTab: 'auction'
    }));
  };

  const resetToRegistration = () => {
    LocalStorageManager.clearGameState();
    window.location.reload(); // Simplest way to reset everything to initial state
  };

  // --- AUCTION LOGIC ---
  useEffect(() => {
    if (!gameState.isOnline) return;

    socket.on('timer_update', ({timer}: any) => {
      setGameState(prev => ({ ...prev, timer }));
    });

    socket.on('bid_placed', ({userId, username, bid}: any) => {
      setBidCount(prev => prev + 1);
      if (soundEnabled) SoundEffects.playBidSound();
      setGameState(prev => ({
         ...prev,
         currentBid: bid,
         highestBidderId: userId,
         timer: 5
      }));
    });

    socket.on('player_sold', ({userId, username, amount}: any) => {
       setGameState(prev => {
         const player = prev.auctionQueue[prev.currentPlayerIndex];
         if (!player) return prev;
         const winnerTeam = prev.teams.find(t => t.id === userId);
         const banner = `${player.name}${player.isOverseas ? ' ✈️' : ''} SOLD TO ${winnerTeam?.name || username} for ₹${(amount / 100).toFixed(2)} Cr`;
         
         if (soundEnabled) SoundEffects.playSellSound();
         setShowSoldBanner(banner);

         const updatedTeams = prev.teams.map(t => {
            if (t.id === userId) {
              return { ...t, purse: t.purse - amount, squad: [...t.squad, { ...player, pricePaid: amount }] };
            }
            return t;
         });
         return {
            ...prev,
            teams: updatedTeams,
            auctionHistory: [...prev.auctionHistory, { playerId: player.id, teamId: userId, price: amount }],
            priceHistory: [...(prev.priceHistory || []), { playerId: player.id, playerName: player.name, price: amount, teamId: userId, timestamp: Date.now() }]
         };
       });
    });

    socket.on('player_unsold', () => {
      setGameState(prev => {
        const player = prev.auctionQueue[prev.currentPlayerIndex];
        if (!player) return prev;
        const banner = `${player.name}${player.isOverseas ? ' ✈️' : ''} UNSOLD`;
        if (soundEnabled) SoundEffects.playUnsoldSound();

        setShowSoldBanner(banner);

        return {
          ...prev,
          auctionHistory: [...prev.auctionHistory, { playerId: player.id, teamId: null, price: 0 }]
        };
      });
    });

    socket.on('room_state_update', (state: any) => {
       setGameState(prev => {
          const isNewPlayer = state.auctionState.currentPlayerIndex !== prev.currentPlayerIndex;
          if (isNewPlayer) {
             setShowSoldBanner(null);
             setBidCount(0);
          }
          
          if (state.auctionState.currentPlayerIndex >= prev.auctionQueue.length) {
             return { ...prev, step: 'summary' };
          }

          return {
             ...prev,
             currentPlayerIndex: state.auctionState.currentPlayerIndex,
             currentBid: state.auctionState.currentBid,
             highestBidderId: state.auctionState.highestBidderId,
             timer: state.auctionState.timer
          };
       });
    });

    return () => {
      socket.off('timer_update');
      socket.off('bid_placed');
      socket.off('player_sold');
      socket.off('player_unsold');
      socket.off('room_state_update');
    };
  }, [gameState.isOnline, soundEnabled]);

  useEffect(() => {
    if (!gameState.isOnline && gameState.step === 'auction' && !gameState.isPaused && !showSoldBanner) {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (prev.timer <= 1 || prev.passedTeams.length === prev.teams.length) {
            // Process SOLD logic directly in the state update to avoid stale closures
            const winnerId = prev.highestBidderId;
            const finalPrice = prev.currentBid;
            const player = prev.auctionQueue[prev.currentPlayerIndex];
            
            let banner = "";
            if (winnerId) {
              const winnerTeam = prev.teams.find(t => t.id === winnerId)!;
              banner = `${player.name}${player.isOverseas ? ' ✈️' : ''} SOLD TO ${winnerTeam.name} for ₹${(finalPrice / 100).toFixed(2)} Cr`;
              // Play sell sound
              if (soundEnabled) {
                SoundEffects.playSellSound();
              }
            } else {
              banner = `${player.name}${player.isOverseas ? ' ✈️' : ''} UNSOLD`;
              // Play unsold sound
              if (soundEnabled) {
                SoundEffects.playUnsoldSound();
              }
            }

            // Only show banner if in auction tab
            if (prev.activeTab === 'auction') {
              setShowSoldBanner(banner);
            } else {
              // If not in auction tab, skip banner and go to next
              setTimeout(() => nextPlayer(), 100); 
            }

            const updatedTeams = prev.teams.map(t => {
              if (winnerId && t.id === winnerId) {
                return {
                  ...t,
                  purse: t.purse - finalPrice,
                  squad: [...t.squad, { ...player, pricePaid: finalPrice }]
                };
              }
              return t;
            });
            
            // Add to price history
            const newPriceHistoryEntry = {
              playerId: player.id,
              playerName: player.name,
              price: finalPrice,
              teamId: winnerId,
              timestamp: Date.now()
            };

            return { 
              ...prev, 
              timer: 0,
              teams: updatedTeams,
              auctionHistory: [...prev.auctionHistory, { playerId: player.id, teamId: winnerId, price: finalPrice }],
              priceHistory: [...(prev.priceHistory || []), newPriceHistoryEntry]
            };
          }
          return { ...prev, timer: Math.max(0, prev.timer - 1) };
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.step, gameState.isPaused, showSoldBanner, gameState.currentPlayerIndex, soundEnabled]);

  // Sold Banner Timeout Effect
  useEffect(() => {
    if (showSoldBanner) {
      if (gameState.isOnline) {
         // In online mode, the server handles auto-advance. We just clear the banner local state after a while.
         const bannerTimer = setTimeout(() => setShowSoldBanner(null), 2000);
         return () => clearTimeout(bannerTimer);
      }
      const waitTime = 1000;
      const timerBar = setTimeout(() => {
        nextPlayer();
      }, waitTime);
      return () => clearTimeout(timerBar);
    }
  }, [showSoldBanner, gameState.isOnline]); // Added isOnline to deps for safety

  // AI Bidding Effect
  useEffect(() => {
    if (gameState.isOnline) return;
    if (gameState.step === 'auction' && !gameState.isPaused && !showSoldBanner) {
      // SLAYER DIFFICULTY: Slashing AI thinking time to 200-500ms for high-octane bidding
      const delay = currentPlayer.starRating >= 4 ? 200 + Math.random() * 300 : 400 + Math.random() * 400;
      aiBidRef.current = setTimeout(() => {
        simulateAIBid();
      }, delay);
    }
    return () => {
      if (aiBidRef.current) clearTimeout(aiBidRef.current);
    };
  }, [gameState.currentBid, gameState.highestBidderId, gameState.step, gameState.isPaused, showSoldBanner, gameState.passedTeams]);

  const simulateAIBid = () => {
    const aiTeams = gameState.teams.filter(t => t.isAI && !gameState.passedTeams.includes(t.id));
    const nextBidAmount = gameState.currentBid === 0 ? currentPlayer.basePrice : calculateNextBid(gameState.currentBid);
    const isHumanHighest = humanTeam && gameState.highestBidderId === humanTeam.id;

    const teamsToPass: string[] = [];

    aiTeams.forEach(team => {
      const isTarget = currentPlayer.targetTeams.includes(team.id);
      const teamStats = getTeamStats(team);
      const auctionProgress = gameState.currentPlayerIndex / gameState.auctionQueue.length;
      
      // SQUAD COMPLETION PROTECTION
      const minPlayersNeeded = 18;
      const playersShort = Math.max(0, minPlayersNeeded - teamStats.totalPlayers);
      const remainingInQueue = gameState.auctionQueue.length - gameState.currentPlayerIndex;
      // Reserve enough for the shortfall but don't over-reserve — minimum 5Cr buffer
      const reservedMoney = Math.max(500, playersShort * 15);
      const effectivePurse = team.purse - reservedMoney;

      if (effectivePurse < nextBidAmount) {
        teamsToPass.push(team.id);
        return;
      }

      let shouldPass = false;

      // DESPERATION MODE: If critically short on players and auction is past halfway, bid on ANYTHING affordable
      const isDesperate = playersShort >= 4 && auctionProgress > 0.5;
      const isUrgent = playersShort >= 2 && auctionProgress > 0.65;

      if (isDesperate && nextBidAmount <= effectivePurse) {
        // In desperation mode — skip all soft cap checks, just bid
        shouldPass = false;
      } else {
        // RULE: Max 25 players (HARD CAP)
        if (teamStats.totalPlayers >= 25) shouldPass = true;
        
        // RULE: Max 8 Overseas (HARD CAP)
        if (currentPlayer.isOverseas && teamStats.overseasCount >= 8) shouldPass = true;

        // RULE: Overseas Overlap (Don't buy 4 overseas batsmen)
        if (currentPlayer.isOverseas && currentPlayer.role === 'Batter' && teamStats.overseasRoles['Batter'] >= 3) shouldPass = true;
        
        // RULE: Overseas Budget Limit (Max 55Cr total)
        if (currentPlayer.isOverseas && (teamStats.overseasSpend + nextBidAmount) > 5500) shouldPass = true;

        // RULE: Tier 1 Spend Limit (Max 55Cr)
        if (currentPlayer.starRating === 5 && (teamStats.tier1Spend + nextBidAmount) > 5500) shouldPass = true;
        
        // RULE: Role overlap prevention (only when not urgent)
        if (!isUrgent && currentPlayer.starRating === 5) {
          if (currentPlayer.role === 'Batter' && teamStats.stars[5] >= 1 && team.squad.some(p => p.role === 'Batter' && p.starRating === 5)) shouldPass = true;
          if (currentPlayer.role === 'Wicketkeeper' && teamStats.stars[5] >= 1) shouldPass = true;
        }

        // MANDATORY ROLE LIMITS (Soft caps — RELAXED when squad is short)
        // The caps widen automatically when team needs more players
        const capBonus = isUrgent ? 3 : 0; // Add +3 to each cap if urgent
        if (currentPlayer.role === 'Batter' && teamStats.counts['Batter'] >= 5 + capBonus) shouldPass = true;
        if (currentPlayer.role === 'Wicketkeeper' && teamStats.counts['Wicketkeeper'] >= 2 + capBonus) shouldPass = true;
        if (currentPlayer.role === 'All-Rounder' && teamStats.counts['All-Rounder'] >= 5 + capBonus) shouldPass = true;
        if (currentPlayer.role === 'Fast Bowler' && teamStats.counts['Fast Bowler'] >= 4 + capBonus) shouldPass = true;
        if (currentPlayer.role === 'Spin Bowler' && teamStats.counts['Spin Bowler'] >= 3 + capBonus) shouldPass = true;
      }

      // STABLE RANDOMNESS
      const teamHash = team.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const playerHash = currentPlayer.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const stableRandom = ((teamHash * 31 + playerHash) % 100) / 100;

      // VALUATIONS (Overseas Integrated Strategy)
      let baseFactor = 1.3;
      if (currentPlayer.isOverseas) {
        // OVERSEAS SPECIFIC VALUATIONS
        switch(currentPlayer.starRating) {
          case 5:
            if (currentPlayer.role === 'Wicketkeeper') baseFactor = 8.0 + stableRandom * 4.0; // 16 to 24Cr
            else if (currentPlayer.role === 'Fast Bowler') baseFactor = 7.0 + stableRandom * 4.0; // 14 to 22Cr
            else if (currentPlayer.role === 'All-Rounder') baseFactor = 6.0 + stableRandom * 3.0; // 12 to 18Cr
            else baseFactor = 5.0 + stableRandom * 4.0; // 10 to 18Cr
            break;
          case 4:
            if (currentPlayer.role === 'Spin Bowler') baseFactor = 4.0 + stableRandom * 3.0; // 8 to 14Cr (Value pick)
            else if (currentPlayer.role === 'Batter') baseFactor = 3.5 + stableRandom * 3.0; // 7 to 13Cr
            else if (currentPlayer.role === 'Fast Bowler') baseFactor = 2.5 + stableRandom * 2.5; // 5 to 10Cr
            else baseFactor = 3.0 + stableRandom * 2.0; 
            break;
          case 3:
            baseFactor = 1.0 + stableRandom * 1.5; // 2 to 5Cr
            break;
          default:
            baseFactor = 0.5 + stableRandom * 1.0; // 1 to 3Cr
        }
        
        // Strategy: Secure at least 1 overseas pacer
        if (currentPlayer.role === 'Fast Bowler' && teamStats.overseasRoles['Fast Bowler'] === 0) {
          baseFactor *= 1.4; // Must have boost
        }
        
        // Strategy: If 4 overseas already play every game, slots 5-8 are cheap
        if (teamStats.overseasCount >= 4) {
          baseFactor *= 0.7; // Spend minimally on backups
        }
      } else {
        // DOMESTIC VALUATIONS
        switch(currentPlayer.starRating) {
          case 5: 
            if (currentPlayer.role === 'Batter') baseFactor = 8.0 + stableRandom * 6.0; 
            else if (currentPlayer.role === 'Wicketkeeper') baseFactor = 10.0 + stableRandom * 5.0; 
            else if (currentPlayer.role === 'All-Rounder') baseFactor = 7.0 + stableRandom * 5.5; 
            else baseFactor = 6.0 + stableRandom * 5.0; 
            break;
          case 4: baseFactor = 3.0 + stableRandom * 4.0; break; 
          case 3: baseFactor = 1.5 + stableRandom * 2.5; break; 
          case 2: baseFactor = 0.5 + stableRandom * 1.5; break; 
          default: baseFactor = 0.5 + stableRandom * 0.5;
        }
      }
      
      const personality = getAIPersonality(team.id);
      const multipliers = getPersonalityMultipliers(personality);
      let maxBidFactor = baseFactor * multipliers.baseFactorMult;
      if (isTarget) maxBidFactor *= 1.4; 

      // SQUAD URGENCY
      const baseUrgency = (Math.max(0, 18 - teamStats.totalPlayers) / 18) * 2.0;
      const endSpike = auctionProgress > 0.75 && teamStats.totalPlayers < 18 ? 3.0 : 0;
      maxBidFactor *= (1 + baseUrgency + endSpike);

      // TACTICAL BIDDING: DRAIN RIVALS
      // If a rival is bidding high, we bid a few more increments to drain them
      const isRivalBidding = gameState.highestBidderId && gameState.highestBidderId !== team.id;
      const isRivalDesperate = isRivalBidding && (gameState.currentBid > 1000); // Only drain on expensive players
      if (isRivalDesperate && team.purse > 5000 && stableRandom > 0.6) {
        // Drain mode: boost evaluation by 20% to stay in the fight longer
        maxBidFactor *= 1.2;
      }

      const finalMaxBid = Math.min(currentPlayer.basePrice * maxBidFactor * multipliers.maxBidMult, effectivePurse);

      // MANDATORY PARTICIPATION CHECK
      // Check last 5 players in history. If we didn't bid on any, force a bid here if slightly affordable
      const recentHistory = gameState.auctionHistory.slice(-5);
      const teamLastBids = recentHistory.filter(h => h.teamId === team.id || gameState.priceHistory?.some(ph => ph.teamId === team.id && ph.timestamp > Date.now() - 60000));
      const isSilent = recentHistory.length >= 5 && teamLastBids.length === 0;

      if (gameState.currentBid >= finalMaxBid) {
        // ANTI-HOARDING: Aggressively bid on cheap players when squad is short
        if (teamStats.totalPlayers < 18 && auctionProgress > 0.5 && nextBidAmount < 300) {
          shouldPass = false; // Must fill the squad!
        } else if (teamStats.totalPlayers < 14 && nextBidAmount < 500) {
          shouldPass = false; // Critically short — bid on anything
        } else if (isSilent && gameState.currentBid < finalMaxBid * 1.3 && teamStats.totalPlayers < 20) {
          shouldPass = false; // Breaking the silence!
        } else {
          shouldPass = true;
        }
      }

      if (shouldPass) teamsToPass.push(team.id);
    });

    if (teamsToPass.length > 0) {
      setGameState(prev => ({
        ...prev,
        passedTeams: Array.from(new Set([...prev.passedTeams, ...teamsToPass]))
      }));
    }

    const activeAIBidders = aiTeams.filter(t => 
      !teamsToPass.includes(t.id) && 
      t.id !== gameState.highestBidderId &&
      (t.purse - (Math.max(0, 18 - t.squad.length - 1) * 20)) >= nextBidAmount
    );

    if (activeAIBidders.length > 0) {
      // FIREWORKS: Force immediate action if no one has bid!
      // Also maintain high aggression if human bids.
      // Increased base chance to 0.98 for high activity
      const baseChance = gameState.currentBid === 0 ? 1.0 : ((isHumanHighest || gameState.highestBidderId) ? 0.98 : 0.92);
      
      // Apply personality-based bid chance modifier
      let bidChance = baseChance;
      activeAIBidders.forEach(bidder => {
        const bidderPersonality = getAIPersonality(bidder.id);
        const bidderMults = getPersonalityMultipliers(bidderPersonality);
        // Aggressive teams bid more often, conservative teams bid less
        if (bidder.id === gameState.highestBidderId) {
          bidChance *= bidderMults.bidChanceMult;
        }
      });
      
      if (Math.random() < bidChance) {
        const bidder = activeAIBidders[Math.floor(Math.random() * activeAIBidders.length)];
        placeBid(bidder.id);
      }
    }
  };

  const calculateNextBid = (current: number) => {
    if (current < 100) return current + 5;
    if (current < 200) return current + 10;
    if (current < 500) return current + 20;
    return current + 50; // Increased increment for fast bidding
  };

  const placeBid = (teamId: string) => {
    if (gameState.isOnline) {
      const nextBidAmount = gameState.currentBid === 0 ? currentPlayer.basePrice : calculateNextBid(gameState.currentBid);
      socket.emit('place_bid', { roomId: gameState.roomId, bid: nextBidAmount });
      return;
    }

    setBidCount(prev => prev + 1); // Track bid count
    setGameState(prev => {
      const nextBid = prev.currentBid === 0 ? currentPlayer.basePrice : calculateNextBid(prev.currentBid);
      const team = prev.teams.find(t => t.id === teamId);
      if (!team || team.purse < nextBid || prev.passedTeams.includes(teamId)) return prev;

      // Play bid sound
      if (soundEnabled) {
        SoundEffects.playBidSound();
      }

      return {
        ...prev,
        currentBid: nextBid,
        highestBidderId: teamId,
        timer: 5,
        passedTeams: prev.passedTeams.filter(id => id !== teamId) 
      };
    });
  };

  const handlePass = (teamId: string) => {
    setGameState(prev => ({
      ...prev,
      passedTeams: prev.passedTeams.includes(teamId) ? prev.passedTeams : [...prev.passedTeams, teamId]
    }));
  };

  const handleSold = () => {
    // This is now handled inside the timer interval for state consistency
  };

  const nextPlayer = () => {
    if (gameState.isOnline) {
      setShowSoldBanner(null);
      // Online mode auto-advances purely from the server.
      // But if the host REALLY needs to manually force skip stuck state:
      if (gameState.isHost && gameState.roomId) {
         socket.emit('next_player', { roomId: gameState.roomId });
      }
      return;
    }

    setShowSoldBanner(null);
    setBidCount(0); // Reset bid count for next player
    setGameState(prev => {
      const nextIndex = prev.currentPlayerIndex + 1;
      if (nextIndex >= prev.auctionQueue.length) {
        return { ...prev, step: 'summary' };
      }
      return {
        ...prev,
        currentPlayerIndex: nextIndex,
        currentBid: 0,
        highestBidderId: null,
        timer: 5,
        passedTeams: []
      };
    });
  };

  // --- UI HELPERS ---
  const formatPrice = (lakhs: number) => {
    if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(2)} Cr`;
    return `₹${lakhs} Lakhs`;
  };

  if (gameState.step === 'mode_select') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel max-w-2xl w-full p-8 sm:p-12 space-y-8 sm:space-y-12 text-center border-t-4 border-mi-secondary"
        >
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl font-bebas text-mi-secondary tracking-wider drop-shadow-[0_0_15px_rgba(238,206,122,0.3)]">IPL 2026</h1>
            <p className="text-white/60 uppercase tracking-[0.2em] text-xs sm:text-sm font-semibold">Ultimate Auction Experience</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-4">
            <button
              onClick={() => {
                 const saved = LocalStorageManager.loadGameState();
                 if (saved && (saved.step === 'auction' || saved.step === 'summary' || saved.step === 'registration')) {
                    if (saved.step === 'auction' && (saved.teams.length === 0 || !saved.teams.some((t: any) => !t.isAI))) {
                       setGameState(prev => ({ ...prev, step: 'registration' }));
                    } else {
                       saved.players = SORTED_PLAYERS;
                       if (saved.currentPlayerIndex === 0 && saved.auctionHistory.length === 0) {
                         saved.auctionQueue = [...SORTED_PLAYERS];
                       }
                       setGameState(saved);
                    }
                 } else {
                    setGameState(prev => ({ ...prev, step: 'registration' }));
                 }
              }}
              className="group relative overflow-hidden bg-white/5 border border-white/10 p-8 rounded-2xl active:scale-95 sm:hover:bg-white/10 sm:hover:border-white/30 transition-all text-center flex flex-col items-center justify-center gap-4 h-full"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-mi-secondary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-2 group-hover:bg-mi-secondary/20 transition-colors z-10">
                <Users2 className="w-8 h-8 text-white group-hover:text-mi-secondary" />
              </div>
              <div className="space-y-1 z-10">
                <h3 className="text-2xl font-bebas tracking-wide">Local Match</h3>
                <p className="text-[10px] text-white/50 uppercase">Play on a single device</p>
              </div>
            </button>

            <button
              onClick={() => setGameState(prev => ({ ...prev, step: 'lobby' }))}
              className="group relative overflow-hidden bg-mi-secondary/10 border border-mi-secondary/30 p-8 rounded-2xl active:scale-95 sm:hover:bg-mi-secondary/20 sm:hover:border-mi-secondary/50 transition-all text-center flex flex-col items-center justify-center gap-4 shadow-[0_0_30px_rgba(238,206,122,0.1)] h-full"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-mi-secondary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute top-4 right-4 bg-red-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Live</div>
              <div className="w-16 h-16 rounded-full bg-mi-secondary/20 flex items-center justify-center mb-2 group-hover:bg-mi-secondary/30 transition-colors z-10">
                <Globe className="w-8 h-8 text-mi-secondary" />
              </div>
              <div className="space-y-1 z-10">
                <h3 className="text-2xl font-bebas tracking-wide text-mi-secondary">Online Realms</h3>
                <p className="text-[10px] text-white/70 uppercase">Real-time Multiplayer</p>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState.step === 'lobby') {
    return <MultiplayerLobby gameState={gameState} setGameState={setGameState} />;
  }

  if (gameState.step === 'registration') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel max-w-2xl w-full p-6 sm:p-8 space-y-6 sm:space-y-8 relative"
        >
          <button onClick={() => setGameState(prev => ({ ...prev, step: 'mode_select' }))} className="text-white/40 hover:text-white flex items-center gap-1 text-sm absolute top-6 left-6 z-10 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          
          <div className="text-center space-y-2 pt-6">
            <h1 className="text-4xl sm:text-5xl text-mi-secondary">IPL 2026</h1>
            <p className="text-white/60 uppercase tracking-widest text-[10px] sm:text-sm">Auction Simulation</p>
          </div>

          {humanRegistrations.length === 0 ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-white/70">How many human players?</label>
                <select 
                  value={numHumans} 
                  onChange={(e) => setNumHumans(parseInt(e.target.value))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg p-4 sm:p-3 outline-none focus:border-mi-secondary text-lg sm:text-base"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1} className="bg-[#050a14]">{i + 1} Player{i > 0 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleStartRegistration}
                className="w-full bg-mi-secondary text-mi-primary font-bebas text-2xl py-4 sm:py-3 rounded-lg active:bg-white sm:hover:bg-white transition-colors flex items-center justify-center gap-2"
              >
                Next <ArrowRight size={24} />
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setHumanRegistrations([])}
                  className="text-white/40 hover:text-white flex items-center gap-1 text-sm transition-colors"
                >
                  <RotateCcw size={14} /> Back
                </button>
                <div className="text-right">
                  <h2 className="text-xl sm:text-2xl leading-none">Player {currentRegIndex + 1}</h2>
                  <span className="text-white/40 text-[10px] uppercase tracking-widest">{currentRegIndex + 1} / {numHumans}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Enter Your Name"
                  className="w-full bg-white/10 border border-white/20 rounded-lg p-4 sm:p-3 outline-none focus:border-mi-secondary text-lg sm:text-base"
                  value={humanRegistrations[currentRegIndex]?.name || ''}
                  onChange={(e) => {
                    const updated = [...humanRegistrations];
                    updated[currentRegIndex].name = e.target.value;
                    setHumanRegistrations(updated);
                  }}
                />
                
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {TEAMS_DATA.map(team => {
                    const isTaken = humanRegistrations.some((r, i) => r.teamId === team.id && i !== currentRegIndex);
                    const isSelected = humanRegistrations[currentRegIndex]?.teamId === team.id;
                    return (
                      <button
                        key={team.id}
                        disabled={isTaken}
                        onClick={() => {
                          const updated = [...humanRegistrations];
                          updated[currentRegIndex].teamId = team.id;
                          setHumanRegistrations(updated);
                        }}
                        className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-all ${
                          isSelected 
                            ? 'border-mi-secondary bg-mi-secondary/20' 
                            : 'border-white/10 bg-white/5 active:bg-white/10 sm:hover:bg-white/10'
                        } ${isTaken ? 'opacity-20 cursor-not-allowed grayscale' : ''}`}
                      >
                        <img src={team.logo} alt={team.name} className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
                        <span className="text-[10px] sm:text-sm font-medium truncate">{team.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {humanRegistrations[currentRegIndex]?.name && humanRegistrations[currentRegIndex]?.teamId && (
                <button 
                  onClick={() => {
                    if (currentRegIndex < numHumans - 1) {
                      setCurrentRegIndex(prev => prev + 1);
                    } else {
                      finalizeTeams();
                    }
                  }}
                  className="w-full bg-mi-secondary text-mi-primary font-bebas text-2xl py-4 sm:py-3 rounded-lg active:bg-white sm:hover:bg-white transition-colors"
                >
                  {currentRegIndex < numHumans - 1 ? 'Next Player' : 'Start Auction'}
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  if (gameState.step === 'summary') {
    const handleDownload = (team: Team) => {
      const grouped = team.squad.reduce((acc, p) => {
        let cat: string = p.role;
        if(cat === 'Batter') cat = 'Batsman';
        if(cat === 'Wicketkeeper') cat = 'Wicket Keepers';
        if(cat === 'All-Rounder') cat = 'All Rounders';
        if(cat === 'Fast Bowler') cat = 'Bowlers';
        if(cat === 'Spin Bowler') cat = 'Spinners';
        if(!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
      }, {} as Record<string, typeof team.squad>);
      
      const cats = ['Batsman', 'Wicket Keepers', 'All Rounders', 'Bowlers', 'Spinners'];
      let squadText = '';
      cats.forEach(cat => {
        if(grouped[cat] && grouped[cat].length > 0) {
          squadText += `\n${cat.toUpperCase()}:\n`;
          grouped[cat].forEach(p => {
             squadText += `- ${p.name}${p.isOverseas ? ' ✈️' : ''} - ${formatPrice(p.pricePaid)}\n`;
          });
        }
      });

      const content = `TEAM: ${team.name}\nOWNER: ${team.ownerName}\nPURSE REMAINING: ${formatPrice(team.purse)}\n\nSQUAD:${squadText}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${team.id}_Squad.txt`;
      a.click();
    };

    const getBestXI = (squad: AuctionedPlayer[]) => {
      const xi: AuctionedPlayer[] = [];
      const roles = ['Wicketkeeper', 'Batter', 'All-Rounder', 'Fast Bowler', 'Spin Bowler'];
      
      const sorted = [...squad].sort((a, b) => b.pricePaid - a.pricePaid);
      
      const wk = sorted.find(p => p.role === 'Wicketkeeper');
      if (wk) xi.push(wk);

      sorted.forEach(p => {
        if (xi.length < 11 && !xi.find(x => x.id === p.id)) {
          const overseasCount = xi.filter(x => x.isOverseas).length;
          if (p.isOverseas && overseasCount >= 4) return;
          xi.push(p);
        }
      });

      return xi;
    };

    return (
      <div className="min-h-screen p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto pb-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-7xl font-bebas text-mi-secondary tracking-tighter">AUCTION COMPLETED</h1>
          
          <div className="flex flex-wrap justify-center gap-3">
            <button 
              onClick={resetToRegistration}
              className="bg-mi-secondary text-mi-primary font-bebas text-lg px-6 py-2 rounded-full active:bg-white sm:hover:bg-white transition-all shadow-lg shadow-mi-secondary/20"
            >
              Start New Auction
            </button>
            <button 
              onClick={() => {
                const squadsSection = document.getElementById('squads-section');
                squadsSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white/10 text-white font-bebas text-lg px-6 py-2 rounded-full hover:bg-white/20 transition-all border border-white/10"
            >
              View Squads
            </button>
            <button 
              onClick={() => setShowFullPlayerList(!showFullPlayerList)}
              className="bg-white/10 text-white font-bebas text-lg px-6 py-2 rounded-full hover:bg-white/20 transition-all border border-white/10"
            >
              {showFullPlayerList ? 'Hide Player List' : 'View All Players'}
            </button>
          </div>
        </div>

        {showFullPlayerList && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 overflow-hidden"
          >
            <h2 className="text-2xl font-bebas text-mi-secondary mb-4 uppercase tracking-wider">Complete Auction List</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-white/5 text-[10px] uppercase text-white/40">
                  <tr>
                    <th className="p-4">Rank/ID</th>
                    <th className="p-4">Player</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Sold To</th>
                    <th className="p-4 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {gameState.auctionQueue.map((p, idx) => {
                    const history = gameState.auctionHistory.find(h => h.playerId === p.id);
                    const team = history?.teamId ? gameState.teams.find(t => t.id === history.teamId) : null;
                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-xs text-white/40 font-mono">#{idx+1}</td>
                        <td className="p-4 flex items-center gap-3">
                          <img src={p.photo} onError={(e) => { e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'; }} className="w-8 h-8 rounded-full object-cover" />
                          <span className="text-sm font-medium">{p.name}{p.isOverseas && ' ✈️'}</span>
                        </td>
                        <td className="p-4 text-xs text-white/60">{p.role}</td>
                        <td className="p-4">
                          {team ? (
                            <div className="flex items-center gap-2">
                              <img src={team.logo} className="w-6 h-6 object-contain" />
                              <span className="text-xs font-bold text-white/80">{team.name}</span>
                            </div>
                          ) : (
                            <span className="text-white/20 text-[10px] uppercase font-bold">Unsold</span>
                          )}
                        </td>
                        <td className="p-4 text-right text-sm font-bebas text-mi-secondary">
                          {history?.teamId ? formatPrice(history.price) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        <div id="squads-section" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bebas text-mi-secondary uppercase tracking-widest">Team Squads Viewer</h2>
            <p className="text-[10px] text-white/40 uppercase">Total Teams: {gameState.teams.length}</p>
          </div>
          
          <div className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory scrollbar-hide">
            {gameState.teams.map(team => {
            const xi = getBestXI(team.squad);

            const copySquadToClipboard = (team: Team) => {
              const grouped = team.squad.reduce((acc, p) => {
                let cat: string = p.role;
                if(cat === 'Batter') cat = 'Batsman';
                if(cat === 'Wicketkeeper') cat = 'Wicket Keepers';
                if(cat === 'All-Rounder') cat = 'All Rounders';
                if(cat === 'Fast Bowler') cat = 'Bowlers';
                if(cat === 'Spin Bowler') cat = 'Spinners';
                if(!acc[cat]) acc[cat] = [];
                acc[cat].push(p);
                return acc;
              }, {} as Record<string, typeof team.squad>);
              
              const cats = ['Batsman', 'Wicket Keepers', 'All Rounders', 'Bowlers', 'Spinners'];
              let squadText = '';
              cats.forEach(cat => {
                if(grouped[cat] && grouped[cat].length > 0) {
                  squadText += `\n${cat.toUpperCase()}:\n`;
                  grouped[cat].forEach(p => {
                     squadText += `- ${p.name}${p.isOverseas ? ' ✈️' : ''} - ${formatPrice(p.pricePaid)}\n`;
                  });
                }
              });

              const content = `TEAM: ${team.name}\nOWNER: ${team.ownerName}\nPURSE REMAINING: ${formatPrice(team.purse)}\n\nSQUAD:${squadText}`;
              navigator.clipboard.writeText(content);
              alert(`${team.name} squad copied to clipboard!`);
            };

            return (
              <div key={team.id} className="min-w-[320px] sm:min-w-[380px] snap-center">
                <div className="glass-panel p-4 sm:p-6 space-y-4 flex flex-col h-full border-t-4" style={{ borderColor: team.primaryColor }}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 p-2">
                       <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bebas tracking-wide truncate">{team.name}</h3>
                      <p className="text-white/40 text-[10px] uppercase tracking-widest truncate">{team.ownerName}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-[11px] sm:text-xs border-y border-white/10 py-3 bg-white/5 px-2 rounded">
                    <div>
                      <span className="text-white/40 uppercase block text-[8px]">Squad Power</span>
                      <span className="text-white font-bold">{team.squad.length} / 25</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white/40 uppercase block text-[8px]">Remaining Purse</span>
                      <span className="text-mi-secondary font-bold">{formatPrice(team.purse)}</span>
                    </div>
                  </div>
  
                  <div className="flex-1 overflow-y-auto max-h-64 pr-2 custom-scrollbar">
                    <h4 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
                      <div className="h-[1px] flex-1 bg-white/10"></div>
                      Suggested Best XI
                      <div className="h-[1px] flex-1 bg-white/10"></div>
                    </h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      {xi.map(p => (
                        <div key={p.id} className="text-[11px] flex justify-between bg-white/5 p-2 rounded border border-white/5 hover:border-white/20 transition-all group">
                          <span className="truncate max-w-[180px] font-medium group-hover:text-mi-secondary transition-colors">{p.name}{p.isOverseas && ' ✈️'}</span>
                          <span className="text-white/40 font-mono text-[9px]">{p.role.toUpperCase()}</span>
                        </div>
                      ))}
                      {xi.length < 11 && <p className="text-[10px] text-red-400 italic text-center py-2 bg-red-400/5 rounded border border-orange-400/20">Incomplete Squad (Need {11 - xi.length} more)</p>}
                    </div>
                  </div>
  
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                    <button 
                      onClick={() => handleDownload(team)}
                      className="flex items-center justify-center gap-2 bg-white/5 active:bg-white/10 hover:bg-white/10 py-2.5 rounded-lg text-xs font-medium transition-all"
                    >
                      <Download size={14} /> Download
                    </button>
                    <button 
                      onClick={() => copySquadToClipboard(team)}
                      className="flex items-center justify-center gap-2 bg-mi-secondary/20 hover:bg-mi-secondary/30 active:bg-mi-secondary/40 text-mi-secondary py-2.5 rounded-lg text-xs font-medium transition-all"
                    >
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#050a14]">
      {/* PAUSE MODAL OVERLAY */}
      <AnimatePresence>
        {gameState.isPaused && (
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
              className="glass-panel p-8 max-w-sm w-full space-y-8 text-center border-white/20 shadow-2xl shadow-black"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-bebas text-mi-secondary tracking-wider">AUCTION PAUSED</h2>
                <p className="text-white/60 text-xs uppercase tracking-widest">Take a breather</p>
              </div>
              
              <div className="space-y-4">
                <button 
                  onClick={() => setGameState(prev => ({ ...prev, isPaused: false }))}
                  className="w-full flex items-center justify-center gap-3 bg-mi-secondary text-mi-primary font-bebas text-xl py-4 rounded-lg active:bg-white hover:bg-white transition-all shadow-lg shadow-mi-secondary/20 hover:scale-[1.02]"
                >
                  <Play size={20} className="fill-current" /> RESUME AUCTION
                </button>

                <button 
                  onClick={() => {
                    if (gameState.isOnline && gameState.roomId) {
                      socket.emit('leave_room', { roomId: gameState.roomId });
                    }
                    setGameState(prev => ({ 
                      ...prev, 
                      step: 'mode_select',
                      isOnline: false,
                      roomId: undefined,
                      onlineUsers: undefined,
                      isPaused: false
                    }));
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-white/10 text-white font-bebas text-xl py-4 rounded-lg active:bg-white/20 hover:bg-white/20 transition-all border border-white/10 hover:scale-[1.02]"
                >
                  <ArrowLeft size={20} /> GO TO MAIN MENU
                </button>

                <button 
                  onClick={resetToRegistration}
                  className="w-full flex items-center justify-center gap-3 bg-white/10 text-white font-bebas text-xl py-4 rounded-lg active:bg-white/20 hover:bg-white/20 transition-all border border-white/10 hover:scale-[1.02]"
                >
                  <UserPlus size={20} /> RESET ALL TEAMS
                </button>

                <button 
                  onClick={() => setGameState(prev => ({ ...prev, step: 'summary', isPaused: false }))}
                  className="w-full flex items-center justify-center gap-3 bg-red-500 text-white font-bebas text-xl py-4 rounded-lg active:bg-red-500/20 hover:bg-white hover:text-red-500 transition-all shadow-lg shadow-red-500/20 hover:scale-[1.02]"
                >
                  <LogOut size={20} /> END AUCTION (SKIP ALL)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP NAV - Responsive */}
      <div className="h-14 sm:h-16 border-b border-white/10 flex items-center justify-between px-4 sm:px-8 bg-black/40 backdrop-blur-md z-40 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl sm:text-2xl text-mi-secondary">IPL 2026</h2>
          <div className="hidden sm:flex gap-4">
            {[
              { id: 'auction', icon: Clock, label: 'Auction' },
              { id: 'list', icon: List, label: 'Auction List' },
              { id: 'squads', icon: Users2, label: 'Squads' },
              { id: 'leaderboard', icon: Trophy, label: 'Live Feed' },
              { id: 'stats', icon: BarChart3, label: 'Statistics' },
              { id: 'comparison', icon: Columns3, label: 'Comparison' },
              { id: 'discover', icon: Compass, label: 'Discover' },
              { id: 'tournament', icon: Trophy, label: 'Tournament' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setGameState(prev => ({ ...prev, activeTab: tab.id as any }))}
                className={`flex items-center gap-2 px-4 py-1 rounded-full transition-all ${
                  gameState.activeTab === tab.id ? 'bg-mi-secondary text-mi-primary' : 'hover:bg-white/10 text-white/60'
                }`}
              >
                <tab.icon size={18} />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {gameState.step === 'auction' && (
            <>
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="bg-white/10 hover:bg-white/20 p-2 sm:p-2.5 rounded-full transition-colors text-white/80 hover:text-white border border-white/10"
                title={soundEnabled ? "Mute Sounds" : "Enable Sounds"}
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button 
                onClick={() => setGameState(prev => ({ ...prev, isPaused: true }))}
                className="bg-white/10 hover:bg-white/20 p-2 sm:p-2.5 rounded-full transition-colors text-white/80 hover:text-white border border-white/10"
                title="Pause Auction"
              >
                <Pause size={18} className="fill-current" />
              </button>
            </>
          )}
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase">Player</p>
            <p className="font-bebas text-lg sm:text-xl leading-none">{gameState.currentPlayerIndex + 1}/{gameState.auctionQueue.length}</p>
          </div>
          {humanTeam && (
            <div className="sm:hidden flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/10">
              <img src={humanTeam.logo} className="w-6 h-6 object-contain" />
              <span className="text-mi-secondary font-bebas text-sm">{formatPrice(humanTeam.purse)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden relative">
        {/* LEFT PANEL - WALLET (Hidden on mobile auction tab) */}
        <div className={`w-full sm:w-72 lg:w-80 border-r border-white/10 bg-black/20 overflow-y-auto p-4 space-y-3 shrink-0 ${
          gameState.activeTab !== 'auction' && gameState.activeTab !== 'list' && gameState.activeTab !== 'squads' ? '' : 'hidden sm:block'
        }`}>
          <h3 className="text-sm font-bebas tracking-widest text-white/40 mb-4">TEAMS WALLET</h3>
          <AnimatePresence mode="popLayout">
            {gameState.teams.map((team, idx) => {
              const isHighest = gameState.highestBidderId === team.id;
              const hasPassed = gameState.passedTeams.includes(team.id);
              return (
                <motion.div 
                  key={team.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                  className={`glass-panel p-3 flex items-center gap-3 team-card-glow ${isHighest ? 'active' : ''} ${hasPassed ? 'opacity-40 grayscale' : ''}`}
                >
                  <img src={team.logo} alt={team.name} className="w-10 h-10 object-contain" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm truncate">{team.name}</h4>
                      {isHighest && <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-[10px] bg-green-500 text-white px-1 rounded"
                      >BIDDING</motion.span>}
                      {hasPassed && <span className="text-[10px] bg-red-500/50 text-white px-1 rounded">PASS</span>}
                    </div>
                    <motion.p 
                      key={team.purse}
                      className="text-mi-secondary font-bebas text-lg leading-none"
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {formatPrice(team.purse)}
                    </motion.p>
                    <p className="text-[10px] text-white/40 uppercase">Squad: {team.squad.length}/25</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* CENTER PANEL - MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto bg-black/10 relative pb-20 sm:pb-0">
          <AnimatePresence mode="wait">
            {gameState.activeTab === 'auction' ? (
              <motion.div 
                key="auction"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6 sm:space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* PLAYER CARD */}
                <motion.div 
                  key={currentPlayer.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-panel overflow-hidden relative group"
                >
                  <div className="aspect-[4/5] sm:aspect-[4/5] relative">
                    <img 
                      src={currentPlayer.photo} 
                      onError={(e) => { e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'; }}
                      alt={currentPlayer.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl sm:text-2xl flex items-center">
                          {currentPlayer.nationality.startsWith("http") ? <img src={currentPlayer.nationality} className="h-5 object-contain rounded-sm shadow-sm border border-white/20" alt="" /> : currentPlayer.nationality}
                        </span>
                        <span className="bg-mi-secondary/20 text-mi-secondary text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                          {getPlayerSet(currentPlayer)}
                        </span>
                      </div>
                      <h2 className="text-3xl sm:text-4xl leading-none mb-2">{currentPlayer.name}{currentPlayer.isOverseas && ' ✈️'}</h2>
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 border-t border-white/10 pt-3 sm:pt-4">
                        {Object.entries(currentPlayer.stats).map(([key, val]) => (
                          <div key={key}>
                            <p className="text-[10px] text-white/40 uppercase truncate">{key}</p>
                            <p className="font-bebas text-lg sm:text-xl">{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* BIDDING INFO & CONTROLS */}
                <div className="space-y-6 flex flex-col justify-center">
                  <div className="flex lg:flex-col justify-between items-end lg:items-start gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] sm:text-sm text-white/40 uppercase tracking-widest">Current Bid</p>
                      <motion.div 
                        key={gameState.currentBid}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        className="bid-number leading-none"
                      >
                        {gameState.currentBid === 0 ? formatPrice(currentPlayer.basePrice) : formatPrice(gameState.currentBid)}
                      </motion.div>
                      {gameState.currentBid === 0 && <p className="text-[10px] text-mi-secondary uppercase">Base Price</p>}
                    </div>

                    {gameState.highestBidderId && (
                      <div className="relative flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 flex-1 lg:w-full overflow-hidden">
                        {/* Subtle background logo */}
                        <img 
                          src={gameState.teams.find(t => t.id === gameState.highestBidderId)?.logo} 
                          className="absolute -right-4 -bottom-4 w-24 h-24 object-contain opacity-10 pointer-events-none" 
                        />
                        <img 
                          src={gameState.teams.find(t => t.id === gameState.highestBidderId)?.logo} 
                          className="w-8 h-8 sm:w-10 sm:h-10 object-contain relative z-10" 
                        />
                        <div className="min-w-0 relative z-10">
                          <p className="text-[8px] sm:text-[10px] text-white/40 uppercase">Leader</p>
                          <p className="text-sm sm:text-lg font-bebas truncate">{gameState.teams.find(t => t.id === gameState.highestBidderId)?.name}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TIMER */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40">
                      <span>Time Remaining</span>
                      <motion.span 
                        key={Math.ceil(gameState.timer)}
                        initial={{ scale: 1.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={gameState.timer <= 2 ? 'text-red-500 font-bold' : ''}
                      >
                        {Math.ceil(gameState.timer)}s
                      </motion.span>
                    </div>
                    <div className={`h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden ${gameState.timer <= 2 ? 'timer-danger' : ''}`}>
                      <motion.div 
                        initial={false}
                        animate={{ width: `${Math.max(0, (gameState.timer / 5) * 100)}%` }}
                        transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                        className={`h-full transition-colors ${gameState.timer <= 2 ? 'bg-red-500' : 'bg-mi-secondary'}`}
                      />
                    </div>
                  </div>

                  {/* BID BUTTONS - Optimized for touch */}
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {(() => {
                      const nextBidAmount = gameState.currentBid === 0 ? currentPlayer.basePrice : calculateNextBid(gameState.currentBid);
                      const minPlayersNeeded = 18;
                      const remainingSpots = Math.max(0, minPlayersNeeded - (humanTeam?.squad.length || 0) - 1);
                      const reservedMoney = remainingSpots * 20; 
                      const isAffordable = humanTeam && (humanTeam.purse - reservedMoney) >= nextBidAmount;
                      const isLeading = humanTeam && gameState.highestBidderId === humanTeam.id;
                      const isFrozen = !isAffordable && !isLeading;

                      return (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: isFrozen || isLeading ? 1 : 1.02 }}
                          disabled={!!showSoldBanner || isFrozen || isLeading}
                          onClick={() => humanTeam && placeBid(humanTeam.id)}
                          className={`bg-mi-secondary text-mi-primary active:bg-white sm:hover:bg-white py-4 sm:py-3 rounded-xl font-bebas text-3xl sm:text-2xl transition-all shadow-lg shadow-mi-secondary/20 ${
                            isFrozen ? 'blur-[2px] grayscale opacity-50 cursor-not-allowed border border-white/20' : ''
                          } ${isLeading ? 'animate-pulse bg-green-500 shadow-lg shadow-green-500/50' : ''} disabled:opacity-20`}
                        >
                          {isLeading ? 'LEADING...' : isFrozen ? 'BUDGET LOCKED' : `BID ${gameState.currentBid === 0 ? formatPrice(currentPlayer.basePrice) : '+' + formatPrice(nextBidAmount - gameState.currentBid)}`}
                        </motion.button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
            ) : gameState.activeTab === 'list' ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 sm:p-8"
            >
              <div className="glass-panel overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[500px]">
                  <thead className="bg-white/5 text-[10px] uppercase text-white/40">
                    <tr>
                      <th className="p-4">Player</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Base</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {gameState.auctionQueue.map((p, idx) => {
                      const history = gameState.auctionHistory.find(h => h.playerId === p.id);
                      const isCurrent = idx === gameState.currentPlayerIndex;
                      return (
                        <tr key={p.id} className={`${isCurrent ? 'bg-mi-secondary/10' : ''}`}>
                          <td className="p-3 sm:p-4 flex items-center gap-3">
                            <img src={p.photo} onError={(e) => { e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'; }} className="w-8 h-8 rounded-full object-cover" />
                            <span className="text-sm font-medium truncate max-w-[120px]">{p.name}{p.isOverseas && ' ✈️'}</span>
                          </td>
                          <td className="p-3 sm:p-4 text-xs text-white/60">{p.role}</td>
                          <td className="p-3 sm:p-4 text-xs">{formatPrice(p.basePrice)}</td>
                          <td className="p-3 sm:p-4">
                            {history ? (
                              history.teamId ? (
                                <div className="flex items-center gap-2">
                                  <img 
                                    src={gameState.teams.find(t => t.id === history.teamId)?.logo} 
                                    className="w-5 h-5 object-contain" 
                                  />
                                  <span className="text-green-500 text-[10px] font-bold uppercase truncate max-w-[60px]">
                                    {gameState.teams.find(t => t.id === history.teamId)?.id}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-white/30 text-[10px]">UNSOLD</span>
                              )
                            ) : isCurrent ? (
                              <span className="text-mi-secondary text-[10px] font-bold animate-pulse">ON BID</span>
                            ) : (
                              <span className="text-white/20 text-[10px]">UPCOMING</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : gameState.activeTab === 'leaderboard' ? (
            <motion.div 
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 sm:p-8 max-w-2xl mx-auto"
            >
              <LiveLeaderboard gameState={gameState} maxEntries={10} />
              <div className="mt-6">
                <BudgetOptimizationHeatmap teams={gameState.teams} />
              </div>
            </motion.div>
          ) : gameState.activeTab === 'stats' ? (
            <motion.div 
              key="stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 sm:p-8 max-w-4xl mx-auto"
            >
              <AuctionStatistics gameState={gameState} />
            </motion.div>
          ) : gameState.activeTab === 'comparison' ? (
            <motion.div 
              key="comparison"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 sm:p-8 max-w-5xl mx-auto"
            >
              <ComparisonView teams={gameState.teams} />
            </motion.div>
          ) : gameState.activeTab === 'discover' ? (
            <motion.div 
              key="discover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 sm:p-8 max-w-6xl mx-auto"
            >
              <PlayerDiscovery 
                players={gameState.auctionQueue}
                auctionedIds={gameState.auctionHistory.map(h => h.playerId)}
              />
            </motion.div>
          ) : gameState.activeTab === 'tournament' ? (
            <motion.div 
              key="tournament"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 sm:p-8 max-w-6xl mx-auto"
            >
              <TournamentBracket teams={gameState.teams} />
            </motion.div>
          ) : (
            <motion.div 
              key="squads"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
            >
              {gameState.teams.map(team => (
                <div key={team.id} className="glass-panel p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <img src={team.logo} alt={team.name} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl truncate">{team.name}</h3>
                        <p className="text-white/40 text-[8px] sm:text-[10px] uppercase truncate">{team.isAI ? 'AI Manager' : `Owner: ${team.ownerName}`}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-mi-secondary font-bebas text-xl sm:text-2xl">{formatPrice(team.purse)}</p>
                      <p className="text-[8px] sm:text-[10px] text-white/40 uppercase">Purse</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] uppercase text-white/40">
                    <div className="bg-white/5 p-1.5 sm:p-2 rounded text-center">
                      <p>Squad</p>
                      <p className="text-white text-xs sm:text-sm font-bebas">{team.squad.length}/25</p>
                    </div>
                    <div className="bg-white/5 p-1.5 sm:p-2 rounded text-center">
                      <p>Overseas</p>
                      <p className="text-white text-xs sm:text-sm font-bebas">{team.squad.filter(p => p.isOverseas).length}/8</p>
                    </div>
                    <div className="bg-white/5 p-1.5 sm:p-2 rounded text-center">
                      <p>Batters</p>
                      <p className="text-white text-xs sm:text-sm font-bebas">{team.squad.filter(p => p.role === 'Batter').length}</p>
                    </div>
                    <div className="bg-white/5 p-1.5 sm:p-2 rounded text-center">
                      <p>Bowlers</p>
                      <p className="text-white text-xs sm:text-sm font-bebas">{team.squad.filter(p => p.role.includes('Bowler')).length}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowSquadModal(team.id)}
                    className="w-full py-2 bg-white/5 active:bg-white/10 sm:hover:bg-white/10 rounded text-[10px] uppercase tracking-widest transition-colors"
                  >
                    View Full Squad
                  </button>
                </div>
              ))}
            </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT PANEL - YOUR SQUAD (Hidden on mobile) */}
        <div className="hidden lg:flex w-80 border-l border-white/10 bg-black/20 p-4 flex-col shrink-0">
          <h3 className="text-sm font-bebas tracking-widest text-white/40 mb-4">YOUR SQUAD</h3>
          {humanTeam ? (
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
              <div className="glass-panel p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <img src={humanTeam.logo} className="w-10 h-10 object-contain" />
                  <div>
                    <h4 className="text-sm font-bold">{humanTeam.name}</h4>
                    <p className="text-mi-secondary font-bebas text-xl">{formatPrice(humanTeam.purse)}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {humanTeam.squad.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-white/20 text-center p-8">
                    <p className="text-sm italic">No players bought yet.</p>
                  </div>
                ) : (
                  ['Batsman', 'Wicket Keepers', 'All Rounders', 'Bowlers', 'Spinners'].map(cat => {
                    const catSquad = humanTeam.squad.filter(p => {
                      let c: string = p.role;
                      if(c === 'Batter') c = 'Batsman';
                      if(c === 'Wicketkeeper') c = 'Wicket Keepers';
                      if(c === 'All-Rounder') c = 'All Rounders';
                      if(c === 'Fast Bowler') c = 'Bowlers';
                      if(c === 'Spin Bowler') c = 'Spinners';
                      return c === cat;
                    });

                    if (catSquad.length === 0) return null;

                    return (
                      <div key={cat} className="space-y-2">
                        <h5 className="text-[10px] font-bold text-mi-secondary uppercase tracking-wider border-b border-white/10 pb-1">{cat}</h5>
                        {catSquad.map(p => (
                          <div key={p.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
                            <img src={p.photo} onError={(e) => { e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'; }} className="w-10 h-10 rounded object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate">{p.name}{p.isOverseas && ' ✈️'}</p>
                            </div>
                            <p className="text-xs font-bebas text-mi-secondary">{formatPrice(p.pricePaid)}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/20 text-center p-8">
              <p className="text-sm italic">Select a team to see your squad</p>
            </div>
          )}
        </div>

        {/* MOBILE BOTTOM NAV */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-lg border-t border-white/10 flex items-center justify-around px-4 z-40 overflow-x-auto">
          {[
            { id: 'auction', icon: Clock, label: 'Auction' },
            { id: 'list', icon: List, label: 'List' },
            { id: 'squads', icon: Users2, label: 'Squads' },
            { id: 'leaderboard', icon: Trophy, label: 'Feed' },
            { id: 'stats', icon: BarChart3, label: 'Stats' },
            { id: 'comparison', icon: Columns3, label: 'Compare' },
            { id: 'discover', icon: Compass, label: 'Discover' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setGameState(prev => ({ ...prev, activeTab: tab.id as any }))}
              className={`flex flex-col items-center gap-1 transition-all shrink-0 ${
                gameState.activeTab === tab.id ? 'text-mi-secondary' : 'text-white/40'
              }`}
            >
              <tab.icon size={20} />
              <span className="text-[10px] font-medium uppercase">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SOLD BANNER OVERLAY */}
      <AnimatePresence>
        {showSoldBanner && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6"
          >
            <div className="text-center space-y-6 sm:space-y-8 w-full max-w-lg">
              {showSoldBanner.includes('SOLD') && gameState.highestBidderId && (
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="mx-auto w-32 h-32 sm:w-48 sm:h-48 bg-white/10 rounded-full p-6 sm:p-8 flex items-center justify-center border border-white/20"
                >
                  <img 
                    src={gameState.teams.find(t => t.id === gameState.highestBidderId)?.logo} 
                    className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                  />
                </motion.div>
              )}
              <motion.h2 
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="text-4xl sm:text-7xl font-bebas text-mi-secondary drop-shadow-2xl"
              >
                {showSoldBanner}
              </motion.h2>
              {(!gameState.isOnline || gameState.isHost) ? (
                <button 
                  onClick={nextPlayer}
                  className="bg-white text-mi-primary font-bebas text-2xl sm:text-3xl px-8 sm:px-12 py-3 sm:py-4 rounded-full active:bg-mi-secondary sm:hover:bg-mi-secondary transition-all flex items-center gap-3 mx-auto"
                >
                  Next Player <ChevronRight size={24} className="sm:w-8 sm:h-8" />
                </button>
              ) : (
                <div className="text-white/60 text-xl font-bebas tracking-widest mt-4 animate-pulse">
                  Waiting for host to proceed...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SQUAD MODAL */}
      <AnimatePresence>
        {showSquadModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-6"
          >
            <div className="glass-panel w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3 sm:gap-4">
                  <img src={gameState.teams.find(t => t.id === showSquadModal)?.logo} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
                  <h2 className="text-xl sm:text-3xl truncate max-w-[200px] sm:max-w-none">{gameState.teams.find(t => t.id === showSquadModal)?.name} Squad</h2>
                </div>
                <button onClick={() => setShowSquadModal(null)} className="p-2 active:bg-white/10 sm:hover:bg-white/10 rounded-full">
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {['Batsman', 'Wicket Keepers', 'All Rounders', 'Bowlers', 'Spinners'].map(cat => {
                  const squad = gameState.teams.find(t => t.id === showSquadModal)?.squad;
                  const catSquad = squad?.filter(p => {
                    let c: string = p.role;
                    if(c === 'Batter') c = 'Batsman';
                    if(c === 'Wicketkeeper') c = 'Wicket Keepers';
                    if(c === 'All-Rounder') c = 'All Rounders';
                    if(c === 'Fast Bowler') c = 'Bowlers';
                    if(c === 'Spin Bowler') c = 'Spinners';
                    return c === cat;
                  }) || [];

                  if (catSquad.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-3">
                      <h3 className="text-xl font-bold border-b border-white/20 pb-1">{cat} ({catSquad.length})</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        <AnimatePresence>
                          {catSquad.map((p, idx) => (
                            <motion.div 
                              key={p.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ delay: idx * 0.05 }}
                              whileHover={{ scale: 1.05, y: -5 }}
                              className="bg-white/5 rounded-xl overflow-hidden border border-white/10 cursor-pointer"
                            >
                              <div className="aspect-square relative">
                                <img src={p.photo} onError={(e) => { e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'; }} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <div className="absolute bottom-2 left-2 right-2">
                                  <p className="text-[10px] sm:text-xs font-bold truncate">{p.name}{p.isOverseas && ' ✈️'}</p>
                                  <motion.p 
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    className="text-[8px] sm:text-[10px] text-mi-secondary font-bebas"
                                  >
                                    {formatPrice(p.pricePaid)}
                                  </motion.p>
                                </div>
                              </div>
                              <div className="p-2 flex justify-between text-[8px] sm:text-[10px] text-white/40 uppercase">
                                <span>{p.role}</span>
                                <span className="flex items-center">
                                  {p.nationality.startsWith("http") ? <img src={p.nationality} className="h-3 ml-1 object-contain" alt="" /> : <span className="ml-1">{p.nationality}</span>}
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
