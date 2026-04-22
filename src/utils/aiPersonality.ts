// AI Personality Types with different bidding strategies
export type AIPersonality = 'aggressive' | 'tactical' | 'conservative';

export const AIPersonalities = {
  aggressive: {
    name: 'Aggressive Bidder',
    description: 'Goes all-in on star players',
    valuationMultiplier: 1.4,
    competitiveBoost: 1.25,
    budgetAllocation: 0.85, // Use 85% of budget
    bidChance: 0.95
  },
  tactical: {
    name: 'Tactical Planner',
    description: 'Balanced approach with team needs',
    valuationMultiplier: 1.1,
    competitiveBoost: 1.1,
    budgetAllocation: 0.65,
    bidChance: 0.8
  },
  conservative: {
    name: 'Conservative Manager',
    description: 'Careful spending, value hunters',
    valuationMultiplier: 0.9,
    competitiveBoost: 1.0,
    budgetAllocation: 0.5,
    bidChance: 0.65
  }
};

export const assignAIPersonality = (teamId: string): AIPersonality => {
  const personalities: AIPersonality[] = ['aggressive', 'tactical', 'conservative'];
  const hash = teamId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return personalities[hash % personalities.length];
};
