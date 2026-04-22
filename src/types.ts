export type Role = 'Batter' | 'Wicketkeeper' | 'All-Rounder' | 'Fast Bowler' | 'Spin Bowler';

export interface Player {
  id: string;
  name: string;
  role: Role;
  nationality: string;
  isOverseas: boolean;
  basePrice: number; // in Lakhs
  photo: string;
  stats: Record<string, string | number>;
  targetTeams: string[];
  starRating: 1 | 2 | 3 | 4 | 5; // Importance level
  tier?: 1 | 2 | 3 | 4; // 1: Marquee, 2: Key, 3: Regular, 4: Uncapped
}

export interface Team {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string;
  purse: number; // in Lakhs (120 Cr = 12000 Lakhs)
  squad: AuctionedPlayer[];
  isAI: boolean;
  ownerName: string;
}

export interface AuctionedPlayer extends Player {
  pricePaid: number;
}

export interface GameState {
  step: 'mode_select' | 'lobby' | 'registration' | 'auction' | 'summary' | 'tournament';
  teams: Team[];
  players: Player[];
  auctionQueue: Player[];
  currentPlayerIndex: number;
  currentBid: number;
  highestBidderId: string | null;
  timer: number;
  isPaused: boolean;
  auctionHistory: { playerId: string; teamId: string | null; price: number }[];
  activeTab: 'auction' | 'list' | 'squads' | 'leaderboard' | 'stats' | 'comparison' | 'discover' | 'tournament';
  soundEnabled?: boolean;
  priceHistory?: { playerId: string; playerName: string; price: number; teamId: string | null; timestamp: number }[];
  passedTeams?: string[];
  isOnline?: boolean;
  roomId?: string | null;
  onlineUserId?: string | null;
  onlineUsers?: any[];
  isHost?: boolean;
}

export interface PriceHistoryEntry {
  playerId: string;
  playerName: string;
  minPrice: number;
  maxPrice: number;
  finalPrice: number;
  soldTeamId: string | null;
  bids: number;
}
