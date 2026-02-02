'use client';

import React, { useEffect } from 'react';

export default function PlanPage() {
  useEffect(() => {
    document.title = 'Zenly Studio - Plan';
  }, []);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-4">plan</h1>
      <p className="text-zinc-400">
        Esta página está en desarrollo. Próximamente estará disponible.
      </p>
    </div>
  );
}
