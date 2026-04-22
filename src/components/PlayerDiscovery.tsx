import React, { useState, useMemo } from 'react';
import { Player, Role } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, X, Star } from 'lucide-react';

interface PlayerDiscoveryProps {
  players: Player[];
  auctionedIds?: string[];
  onSelectPlayer?: (player: Player) => void;
}

const ROLES: Role[] = ['Batter', 'Wicketkeeper', 'All-Rounder', 'Fast Bowler', 'Spin Bowler'];
const NATIONALITIES = ['India', 'Australia', 'England', 'Pakistan', 'South Africa', 'New Zealand', 'West Indies', 'Sri Lanka', 'Bangladesh'];

export const PlayerDiscovery: React.FC<PlayerDiscoveryProps> = ({ players, auctionedIds = [], onSelectPlayer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [selectedNationalities, setSelectedNationalities] = useState<string[]>([]);
  const [selectedStarRatings, setSelectedStarRatings] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      // Skip already auctioned players
      if (auctionedIds.includes(player.id)) return false;

      // Name search
      if (searchTerm && !player.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Role filter
      if (selectedRoles.length > 0 && !selectedRoles.includes(player.role)) {
        return false;
      }

      // Price range filter
      if (player.basePrice < priceRange[0] || player.basePrice > priceRange[1]) {
        return false;
      }

      // Nationality filter
      if (selectedNationalities.length > 0) {
        const playerNation = typeof player.nationality === 'string' && !player.nationality.startsWith('http')
          ? player.nationality
          : 'International';
        if (!selectedNationalities.includes(playerNation)) {
          return false;
        }
      }

      // Star rating filter
      if (selectedStarRatings.length > 0 && !selectedStarRatings.includes(player.starRating)) {
        return false;
      }

      return true;
    });
  }, [players, searchTerm, selectedRoles, priceRange, selectedNationalities, selectedStarRatings, auctionedIds]);

  const toggleRole = (role: Role) => {
    setSelectedRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const toggleNationality = (nation: string) => {
    setSelectedNationalities(prev =>
      prev.includes(nation) ? prev.filter(n => n !== nation) : [...prev, nation]
    );
  };

  const toggleStarRating = (rating: number) => {
    setSelectedStarRatings(prev =>
      prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRoles([]);
    setPriceRange([0, 2000]);
    setSelectedNationalities([]);
    setSelectedStarRatings([]);
  };

  const hasActiveFilters = searchTerm || selectedRoles.length > 0 || selectedNationalities.length > 0 || selectedStarRatings.length > 0 || priceRange[0] > 0 || priceRange[1] < 2000;

  const formatPrice = (lakhs: number) => {
    if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(1)} Cr`;
    return `₹${lakhs} L`;
  };

  return (
    <div className="space-y-4">
      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
        <input
          type="text"
          placeholder="Search players by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:border-mi-secondary focus:outline-none transition-colors"
        />
      </div>

      {/* FILTER TOGGLE & QUICK STATS */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/80 transition-colors"
        >
          <Filter size={18} />
          <span>Filters</span>
          {hasActiveFilters && <span className="w-2 h-2 bg-mi-secondary rounded-full ml-2" />}
        </button>
        <div className="text-[10px] text-white/60 uppercase tracking-widest">
          {filteredPlayers.length} available • {players.length - auctionedIds.length} total
        </div>
      </div>

      {/* FILTER PANEL */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="glass-panel p-4 space-y-4 overflow-hidden"
          >
            {/* PRICE RANGE */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/80">Price Range</h4>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="2000"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([Math.min(Number(e.target.value), priceRange[1]), priceRange[1]])}
                  className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
                <input
                  type="range"
                  min="0"
                  max="2000"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0])])}
                  className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="text-xs text-white/60 text-right">
                {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
              </div>
            </div>

            {/* ROLES */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/80">Position</h4>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(role => (
                  <button
                    key={role}
                    onClick={() => toggleRole(role)}
                    className={`px-3 py-2 rounded text-xs font-medium uppercase tracking-wider transition-all ${
                      selectedRoles.includes(role)
                        ? 'bg-mi-secondary text-mi-primary'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* STAR RATING */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/80">Star Rating</h4>
              <div className="flex gap-2">
                {[5, 4, 3, 2, 1].map(rating => (
                  <button
                    key={rating}
                    onClick={() => toggleStarRating(rating)}
                    className={`flex items-center gap-1 px-3 py-2 rounded text-xs font-medium transition-all ${
                      selectedStarRatings.includes(rating)
                        ? 'bg-mi-secondary text-mi-primary'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    <Star size={14} className="fill-current" />
                    {rating}★
                  </button>
                ))}
              </div>
            </div>

            {/* NATIONALITY */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/80">Nationality</h4>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                {NATIONALITIES.map(nation => (
                  <button
                    key={nation}
                    onClick={() => toggleNationality(nation)}
                    className={`px-3 py-2 rounded text-xs font-medium uppercase tracking-wider transition-all text-left ${
                      selectedNationalities.includes(nation)
                        ? 'bg-mi-secondary text-mi-primary'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {nation}
                  </button>
                ))}
              </div>
            </div>

            {/* CLEAR FILTERS */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-red-400 text-xs font-medium uppercase transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* PLAYER GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <AnimatePresence>
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map((player, idx) => (
              <motion.button
                key={player.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.02 }}
                whileHover={{ scale: 1.05, y: -5 }}
                onClick={() => onSelectPlayer?.(player)}
                className="relative group glass-panel p-2 rounded-lg overflow-hidden hover:border-mi-secondary border border-white/10 transition-all"
              >
                <div className="aspect-square relative mb-2 overflow-hidden rounded">
                  <img
                    src={player.photo}
                    onError={(e) => {
                      e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png';
                    }}
                    alt={player.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  
                  {/* STAR RATING BADGE */}
                  <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/60 px-2 py-1 rounded">
                    {[...Array(player.starRating)].map((_, i) => (
                      <Star key={i} size={10} className="fill-mi-secondary text-mi-secondary" />
                    ))}
                  </div>

                  {/* OVERSEAS BADGE */}
                  {player.isOverseas && (
                    <div className="absolute top-2 left-2 bg-blue-500/80 text-white text-[8px] px-2 py-1 rounded font-bold">
                      ✈️ OS
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <p className="text-xs font-bold truncate">{player.name}</p>
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <p className="text-[10px] text-mi-secondary font-bebas">{formatPrice(player.basePrice)}</p>
                  <p className="text-[9px] text-white/60 uppercase truncate">{player.role}</p>
                </div>
              </motion.button>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-12 text-center text-white/40"
            >
              <p className="text-sm">No players match your filters.</p>
              <button
                onClick={clearFilters}
                className="text-xs text-mi-secondary hover:underline mt-2"
              >
                Clear filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
