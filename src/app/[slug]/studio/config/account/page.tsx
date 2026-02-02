import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { getAuthIdentities } from '@/lib/actions/studio/account/auth-identities';
import { obtenerPerfil } from '@/lib/actions/studio/account/perfil.actions';
import { AccountContent } from './AccountContent';
import { PerfilSkeleton, SecuritySkeleton } from './components';

export const metadata: Metadata = {
  title: 'Zenly Studio - Configuración de Cuenta',
  description: 'Gestiona tu perfil, seguridad y actividad reciente',
};

interface AccountPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { slug: studioSlug } = await params;

  const [identitiesResult, perfilResult] = await Promise.all([
    getAuthIdentities(),
    obtenerPerfil(studioSlug),
  ]);

  const identities = identitiesResult ?? { hasPassword: false, hasGoogle: false, googleOnly: false };
  const perfil = perfilResult.success ? perfilResult.data : null;
  const perfilError = !perfilResult.success ? (perfilResult.error as string) : null;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Configuración de Cuenta</h1>
          <p className="text-zinc-400">
            Gestiona tu información personal, seguridad y revisa la actividad reciente.
          </p>
        </header>

        {perfilError && !perfil ? (
          <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-4 text-red-200">
            {perfilError}
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="space-y-8">
                <PerfilSkeleton />
                <SecuritySkeleton />
              </div>
            }
          >
            <AccountContent
              studioSlug={studioSlug}
              initialPerfil={perfil}
              authIdentities={identities}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
