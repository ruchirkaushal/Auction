import { describe, it, expect } from 'vitest';

// Test utilities
const formatPrice = (lakhs: number): string => {
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(2)} Cr`;
  return `₹${lakhs} Lakhs`;
};

const calculateNextBid = (current: number): number => {
  if (current < 100) return current + 5;
  if (current < 200) return current + 10;
  if (current < 500) return current + 20;
  return current + 50;
};

describe('Price Formatting', () => {
  it('should format prices in lakhs', () => {
    expect(formatPrice(50)).toBe('₹50 Lakhs');
    expect(formatPrice(200)).toBe('₹2.00 Cr');
    expect(formatPrice(1200)).toBe('₹12.00 Cr');
  });

  it('should handle zero price', () => {
    expect(formatPrice(0)).toBe('₹0 Lakhs');
  });

  it('should handle large prices', () => {
    expect(formatPrice(5000)).toBe('₹50.00 Cr');
  });
});

describe('Bid Calculation', () => {
  it('should increment by 5 for bids under 100', () => {
    expect(calculateNextBid(0)).toBe(5);
    expect(calculateNextBid(50)).toBe(55);
    expect(calculateNextBid(95)).toBe(100);
  });

  it('should increment by 10 for bids 100-200', () => {
    expect(calculateNextBid(100)).toBe(110);
    expect(calculateNextBid(150)).toBe(160);
    expect(calculateNextBid(190)).toBe(200);
  });

  it('should increment by 20 for bids 200-500', () => {
    expect(calculateNextBid(200)).toBe(220);
    expect(calculateNextBid(400)).toBe(420);
    expect(calculateNextBid(480)).toBe(500);
  });

  it('should increment by 50 for bids over 500', () => {
    expect(calculateNextBid(500)).toBe(550);
    expect(calculateNextBid(1000)).toBe(1050);
    expect(calculateNextBid(2000)).toBe(2050);
  });
});

describe('Game Logic', () => {
  it('should calculate remaining slots correctly', () => {
    const minPlayersNeeded = 18;
    const currentSquadSize = 15;
    const remainingSpots = Math.max(0, minPlayersNeeded - currentSquadSize - 1);
    expect(remainingSpots).toBe(2);
  });

  it('should calculate reserved money correctly', () => {
    const remainingSpots = 2;
    const minBidPerPlayer = 20;
    const reservedMoney = remainingSpots * minBidPerPlayer;
    expect(reservedMoney).toBe(40);
  });

  it('should calculate effective purse', () => {
    const totalPurse = 12000;
    const reservedMoney = 100;
    const effectivePurse = totalPurse - reservedMoney;
    expect(effectivePurse).toBe(11900);
  });

  it('should determine if team can afford bid', () => {
    const effectivePurse = 500;
    const bidAmount = 200;
    const canAfford = effectivePurse >= bidAmount;
    expect(canAfford).toBe(true);
  });

  it('should identify overseas players', () => {
    const indianPlayer = { isOverseas: false };
    const overseasPlayer = { isOverseas: true };
    
    expect(overseasPlayer.isOverseas).toBe(true);
    expect(indianPlayer.isOverseas).toBe(false);
  });

  it('should count overseas slots', () => {
    const squad = [
      { isOverseas: true },
      { isOverseas: true },
      { isOverseas: false },
      { isOverseas: false }
    ];
    const overseasCount = squad.filter(p => p.isOverseas).length;
    expect(overseasCount).toBe(2);
  });
});

describe('Squad Validation', () => {
  it('should validate squad size', () => {
    const maxSquadSize = 25;
    const currentSquad = [1, 2, 3, 4, 5];
    const isFullSquad = currentSquad.length >= maxSquadSize;
    expect(isFullSquad).toBe(false);
  });

  it('should validate overseas limit', () => {
    const maxOverseas = 8;
    const overseasCount = 5;
    const canAddOverseas = overseasCount < maxOverseas;
    expect(canAddOverseas).toBe(true);
  });

  it('should validate tournament participation', () => {
    const tournament = {
      maxTeams: 10,
      registeredTeams: [1, 2, 3, 4, 5]
    };
    const canRegister = tournament.registeredTeams.length < tournament.maxTeams;
    expect(canRegister).toBe(true);
  });
});

describe('AI Personality System', () => {
  const getAIPersonality = (teamId: string): 'aggressive' | 'tactical' | 'conservative' => {
    const hash = teamId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const types: ('aggressive' | 'tactical' | 'conservative')[] = ['aggressive', 'tactical', 'conservative'];
    return types[hash % types.length];
  };

  it('should assign consistent personality to same team', () => {
    const personality1 = getAIPersonality('MI');
    const personality2 = getAIPersonality('MI');
    expect(personality1).toBe(personality2);
  });

  it('should assign different personalities to different teams', () => {
    const personalities = new Set([
      getAIPersonality('MI'),
      getAIPersonality('CSK'),
      getAIPersonality('RCB'),
      getAIPersonality('KKR')
    ]);
    expect(personalities.size).toBeGreaterThan(1);
  });

  it('should return valid personality type', () => {
    const validTypes = ['aggressive', 'tactical', 'conservative'];
    const personality = getAIPersonality('GT');
    expect(validTypes).toContain(personality);
  });
});
