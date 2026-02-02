'use client';

import React, { useState } from 'react';
import type { AuthIdentities } from '@/lib/actions/studio/account/auth-identities';
import type { PerfilData } from './types';
import {
  PerfilForm,
  PerfilSkeleton,
  PasswordChangeForm,
  SecuritySettings,
  SessionsHistory,
} from './components';
import { Shield } from 'lucide-react';

interface AccountContentProps {
  studioSlug: string;
  initialPerfil: PerfilData | null;
  authIdentities: AuthIdentities;
}

export function AccountContent({
  studioSlug,
  initialPerfil,
  authIdentities,
}: AccountContentProps) {
  const [perfil, setPerfil] = useState<PerfilData | null>(initialPerfil);
  const { googleOnly } = authIdentities;

  return (
    <div className="space-y-10">
      {/* Sección 1: Información Personal */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white border-b border-zinc-800 pb-2">
          Información Personal
        </h2>
        {perfil ? (
          <PerfilForm studioSlug={studioSlug} perfil={perfil} onPerfilUpdate={setPerfil} />
        ) : (
          <PerfilSkeleton />
        )}
      </section>

      {/* Sección 2: Seguridad y Acceso */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white border-b border-zinc-800 pb-2">
          Seguridad y Acceso
        </h2>

        {googleOnly ? (
          <>
            <div className="rounded-lg border border-blue-800/50 bg-blue-900/20 p-4 flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-200 font-medium">Tu acceso está gestionado por Google</p>
                <p className="text-zinc-400 text-sm mt-1">
                  Inicias sesión con tu cuenta de Google. No tienes contraseña de plataforma; para
                  cambiar el acceso usa la configuración de tu cuenta de Google.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <SecuritySettings studioSlug={studioSlug} />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PasswordChangeForm studioSlug={studioSlug} />
            <SecuritySettings studioSlug={studioSlug} />
          </div>
        )}
      </section>

      {/* Sección 3: Actividad Reciente */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white border-b border-zinc-800 pb-2">
          Actividad Reciente
        </h2>
        <SessionsHistory studioSlug={studioSlug} />
      </section>
    </div>
  );
}
