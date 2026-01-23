'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';

interface ProgressStepItemProps {
  label: string;
  completed: boolean;
  active: boolean;
}

export function ProgressStepItem({ label, completed, active }: ProgressStepItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">
        {completed ? (
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
        ) : active ? (
          <div className="w-6 h-6 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center">
            <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-700" />
        )}
      </div>
      <span className="text-sm text-white">
        {label}
      </span>
    </div>
  );
}

