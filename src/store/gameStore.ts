import { create } from 'zustand';
import { GameState, Team, Player, PriceHistoryEntry } from '../types';
import { TEAMS_DATA, ALL_PLAYERS } from '../constants';

const INITIAL_PURSE = 12000;

interface GameStore extends GameState {
  // Actions
  setStep: (step: GameState['step']) => void;
  setTeams: (teams: Team[]) => void;
  setCurrentPlayerIndex: (index: number) => void;
  setCurrentBid: (bid: number) => void;
  setHighestBidderId: (id: string | null) => void;
  setTimer: (time: number) => void;
  setPaused: (paused: boolean) => void;
  addToAuctionHistory: (entry: any) => void;
  addToPriceHistory: (entry: PriceHistoryEntry) => void;
  setActiveTab: (tab: GameState['activeTab']) => void;
  addPassedTeam: (teamId: string) => void;
  clearPassedTeams: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  resetGame: () => void;
  updateTeamPurse: (teamId: string, amount: number) => void;
  updateTeamSquad: (teamId: string, player: any) => void;
}

const initialState: GameState = {
  step: 'mode_select',
  teams: [],
  players: ALL_PLAYERS,
  auctionQueue: [...ALL_PLAYERS],
  currentPlayerIndex: 0,
  currentBid: 0,
  highestBidderId: null,
  timer: 5,
  isPaused: false,
  auctionHistory: [],
  activeTab: 'auction',
  passedTeams: [],
  soundEnabled: true,
  priceHistory: []
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  
  setStep: (step) => set({ step }),
  
  setTeams: (teams) => set({ teams }),
  
  setCurrentPlayerIndex: (index) => set({ currentPlayerIndex: index }),
  
  setCurrentBid: (bid) => set({ currentBid: bid }),
  
  setHighestBidderId: (id) => set({ highestBidderId: id }),
  
  setTimer: (time) => set({ timer: time }),
  
  setPaused: (paused) => set({ isPaused: paused }),
  
  addToAuctionHistory: (entry) => set((state) => ({
    auctionHistory: [...state.auctionHistory, entry]
  })),
  
  addToPriceHistory: (entry) => set((state) => {
    const priceHistory = [...(state.priceHistory || []), entry as any];
    return { priceHistory } as Partial<GameStore>;
  }),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  addPassedTeam: (teamId) => set((state) => {
    const current = state.passedTeams || [];
    return {
      passedTeams: Array.from(new Set([...current, teamId]))
    };
  }),
  
  clearPassedTeams: () => set({ passedTeams: [] }),
  
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  
  updateTeamPurse: (teamId, amount) => set((state) => ({
    teams: state.teams.map(t =>
      t.id === teamId ? { ...t, purse: amount } : t
    )
  })),
  
  updateTeamSquad: (teamId, player) => set((state) => ({
    teams: state.teams.map(t =>
      t.id === teamId ? { ...t, squad: [...t.squad, player] } : t
    )
  })),
  
  resetGame: () => set(initialState)
}));
