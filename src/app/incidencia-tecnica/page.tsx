import { Suspense } from 'react';
import IncidenciaTecnicaContent from './IncidenciaTecnicaContent';

function IncidenciaFallback() {
    return (
        <div className="min-h-svh w-full flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black">
            <div className="rounded-full bg-amber-950/40 border border-amber-800/50 p-6 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-amber-500/30" />
            </div>
            <p className="mt-6 text-zinc-500 text-sm">Cargando...</p>
        </div>
    );
}

export default function IncidenciaTecnicaPage() {
    return (
        <Suspense fallback={<IncidenciaFallback />}>
            <IncidenciaTecnicaContent />
        </Suspense>
    );
}
