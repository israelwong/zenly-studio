'use client';

import { useRouter } from 'next/navigation';
import { ZenButton, ZenCard, ZenCardContent, ZenCardFooter, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { createClient } from '@/lib/supabase/browser';
import { Construction, LogOut } from 'lucide-react';

/**
 * Página "Coming Soon" para usuarios nuevos sin studio.
 * En Fase 5 se convertirá en el wizard "Crea tu primer estudio".
 */
export default function OnboardingComingSoonPage() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-zinc-950">
      <div className="w-full max-w-md">
        <ZenCard className="border-zinc-800 bg-zinc-900/50">
          <ZenCardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
              <Construction className="h-7 w-7 text-amber-500" />
            </div>
            <ZenCardTitle className="text-xl">
              ¡Bienvenido a ProSocial!
            </ZenCardTitle>
          </ZenCardHeader>
          <ZenCardContent className="text-center">
            <p className="text-zinc-400">
              Estamos preparando todo para ti. Actualmente estamos en fase de construcción.
              Tu cuenta ha sido registrada y te notificaremos cuando el acceso esté disponible.
            </p>
          </ZenCardContent>
          <ZenCardFooter className="pt-2">
            <ZenButton
              type="button"
              variant="outline"
              className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-800"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </ZenButton>
          </ZenCardFooter>
        </ZenCard>
      </div>
    </div>
  );
}
