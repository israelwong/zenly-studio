'use client';

import React from 'react';
import { Eye, MousePointerClick, TrendingUp, BarChart3 } from 'lucide-react';
import type { OfferStats } from '@/types/offers';

interface OfferStatsMinimalProps {
  stats: OfferStats;
}

export function OfferStatsMinimal({ stats }: OfferStatsMinimalProps) {
  return (
    <div className="flex items-center gap-4 sm:gap-6 px-3 py-2 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Eye className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-xs sm:text-sm text-zinc-400">Landing</span>
        <span className="text-xs sm:text-sm font-semibold text-zinc-200">{stats.total_landing_visits}</span>
      </div>

      <div className="h-4 w-px bg-zinc-800" />

      <div className="flex items-center gap-1.5 sm:gap-2">
        <MousePointerClick className="h-3.5 w-3.5 text-purple-400" />
        <span className="text-xs sm:text-sm text-zinc-400">Leadform</span>
        <span className="text-xs sm:text-sm font-semibold text-zinc-200">{stats.total_leadform_visits}</span>
      </div>

      <div className="h-4 w-px bg-zinc-800" />

      <div className="flex items-center gap-1.5 sm:gap-2">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-xs sm:text-sm text-zinc-400">Conversiones</span>
        <span className="text-xs sm:text-sm font-semibold text-zinc-200">{stats.total_submissions}</span>
      </div>

      <div className="h-4 w-px bg-zinc-800" />

      <div className="flex items-center gap-1.5 sm:gap-2">
        <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs sm:text-sm text-zinc-400">Tasa</span>
        <span className="text-xs sm:text-sm font-semibold text-emerald-400">{stats.conversion_rate.toFixed(1)}%</span>
      </div>
    </div>
  );
}
