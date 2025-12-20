export function CrewMemberCardSkeleton() {
  return (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar con animación suave */}
          <div className="w-12 h-12 bg-zinc-700/50 rounded-full flex-shrink-0 animate-pulse" />

          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Nombre y Badge */}
            <div className="flex items-center gap-2">
              <div className="h-4 bg-zinc-700/50 rounded w-28 animate-pulse" />
              <div className="h-5 w-16 bg-zinc-700/40 rounded-full animate-pulse" />
            </div>
            {/* Email/Phone */}
            <div className="h-3 bg-zinc-700/40 rounded w-36 animate-pulse" />
          </div>
        </div>

        {/* Menu button */}
        <div className="flex-shrink-0 ml-2">
          <div className="h-8 w-8 bg-zinc-700/40 rounded animate-pulse" />
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="h-6 w-20 bg-zinc-700/40 rounded-full animate-pulse" />
        <div className="h-6 w-16 bg-zinc-700/40 rounded-full animate-pulse" />
        <div className="h-6 w-24 bg-zinc-700/40 rounded-full animate-pulse" />
      </div>

      {/* Salario */}
      <div className="h-3 bg-zinc-700/40 rounded w-32 mb-4 animate-pulse" />

      {/* Cuenta status */}
      <div className="h-5 w-24 bg-zinc-700/30 rounded animate-pulse" />
    </div>
  );
}

