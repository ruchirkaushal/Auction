import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Filter, X } from 'lucide-react';
import { AuctionedPlayer, Role } from '../types';

interface FFSquadViewerProps {
  squad: AuctionedPlayer[];
  teamName: string;
  onClose?: () => void;
}

type RoleFilter = Role | 'All';
type PriceRange = 'All' | 'Under100' | '100to500' | '500to1000' | 'Above1000';

export const FilteredSquadViewer: React.FC<FFSquadViewerProps> = ({
  squad,
  teamName,
  onClose
}) => {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All');
  const [priceFilter, setPriceFilter] = useState<PriceRange>('All');
  const [nationalityFilter, setNationalityFilter] = useState<'All' | 'Domestic' | 'Overseas'>('All');

  const formatPrice = (lakhs: number) => {
    if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(2)} Cr`;
    return `₹${lakhs} Lakhs`;
  };

  const filteredSquad = useMemo(() => {
    return squad.filter(player => {
      // Role filter
      if (roleFilter !== 'All' && player.role !== roleFilter) return false;

      // Price filter
      if (priceFilter !== 'All') {
        const price = player.pricePaid;
        if (priceFilter === 'Under100' && price >= 100) return false;
        if (priceFilter === '100to500' && (price < 100 || price > 500)) return false;
        if (priceFilter === '500to1000' && (price < 500 || price > 1000)) return false;
        if (priceFilter === 'Above1000' && price < 1000) return false;
      }

      // Nationality filter
      if (nationalityFilter === 'Domestic' && player.isOverseas) return false;
      if (nationalityFilter === 'Overseas' && !player.isOverseas) return false;

      return true;
    });
  }, [squad, roleFilter, priceFilter, nationalityFilter]);

  const roles: RoleFilter[] = ['All', 'Batter', 'Wicketkeeper', 'All-Rounder', 'Fast Bowler', 'Spin Bowler'];

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="glass-panel p-4 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-mi-secondary" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/60">Filters</span>
        </div>

        {/* Role Filter */}
        <div>
          <label className="text-xs uppercase text-white/40 block mb-2">Role</label>
          <div className="flex flex-wrap gap-2">
            {roles.map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  roleFilter === role
                    ? 'bg-mi-secondary text-mi-primary'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Price Filter */}
        <div>
          <label className="text-xs uppercase text-white/40 block mb-2">Price Range</label>
          <div className="flex flex-wrap gap-2">
            {(['All', 'Under100', '100to500', '500to1000', 'Above1000'] as const).map(range => (
              <button
                key={range}
                onClick={() => setPriceFilter(range)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  priceFilter === range
                    ? 'bg-mi-secondary text-mi-primary'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {range === 'All'
                  ? 'All'
                  : range === 'Under100'
                    ? '< ₹1 Cr'
                    : range === '100to500'
                      ? '₹1-5 Cr'
                      : range === '500to1000'
                        ? '₹5-10 Cr'
                        : '> ₹10 Cr'}
              </button>
            ))}
          </div>
        </div>

        {/* Nationality Filter */}
        <div>
          <label className="text-xs uppercase text-white/40 block mb-2">Nationality</label>
          <div className="flex gap-2">
            {(['All', 'Domestic', 'Overseas'] as const).map(nat => (
              <button
                key={nat}
                onClick={() => setNationalityFilter(nat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  nationalityFilter === nat
                    ? 'bg-mi-secondary text-mi-primary'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {nat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="glass-panel p-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs uppercase text-white/60">
            Showing {filteredSquad.length} of {squad.length} players
          </p>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredSquad.length === 0 ? (
            <p className="text-center text-white/40 py-6">No players match your filters</p>
          ) : (
            filteredSquad.map((player, idx) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="bg-white/5 p-3 rounded-lg border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors"
              >
                <img
                  src={player.photo}
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png';
                  }}
                  className="w-10 h-10 rounded object-cover"
                  alt={player.name}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">
                    {player.name}
                    {player.isOverseas && ' ✈️'}
                  </p>
                  <div className="flex gap-2 text-[10px] text-white/60">
                    <span>{player.role}</span>
                    <span className="text-white/40">•</span>
                    <span>{player.nationality.startsWith('http') ? 'Overseas' : player.nationality}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bebas text-mi-secondary">{formatPrice(player.pricePaid)}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
