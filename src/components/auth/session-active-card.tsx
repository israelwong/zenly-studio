'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardFooter, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { logout } from '@/lib/actions/auth/logout.action';
import { clearRememberMePreference } from '@/lib/supabase/storage-adapter';
import { LogOut, LayoutDashboard } from 'lucide-react';

interface SessionActiveCardProps {
  email: string;
  continueHref: string;
}

export function SessionActiveCard({ email, continueHref }: SessionActiveCardProps) {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      clearRememberMePreference();
      await logout('/login');
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
      setSigningOut(false);
    }
  }

  return (
    <ZenCard className="w-full max-w-md border-zinc-800 bg-zinc-900/50">
      <ZenCardHeader className="text-center">
        <ZenCardTitle className="text-xl">Sesión Activa</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="text-center">
        <p className="text-zinc-400">
          Actualmente estás conectado como <strong className="text-zinc-200">{email}</strong>.
        </p>
      </ZenCardContent>
      <ZenCardFooter className="flex flex-col gap-3 pt-2">
        <ZenButton asChild variant="primary" className="w-full">
          <Link href={continueHref}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Continuar al Estudio
          </Link>
        </ZenButton>
        <ZenButton
          type="button"
          variant="outline"
          className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {signingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
        </ZenButton>
      </ZenCardFooter>
    </ZenCard>
  );
}
