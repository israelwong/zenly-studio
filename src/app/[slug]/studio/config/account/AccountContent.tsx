'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import type { AuthIdentities } from '@/lib/actions/studio/account/auth-identities';
import type { PerfilData } from './types';
import {
  PerfilForm,
  PerfilSkeleton,
  PasswordChangeForm,
  SecuritySettings,
  SessionsHistory,
} from './components';
import { ZenButton, ZenConfirmModal } from '@/components/ui/zen';
import { unlinkGoogleIdentity } from '@/lib/actions/studio/account/auth-identities';
import { Shield } from 'lucide-react';

const GoogleLogo = () => (
  <svg className="mr-2 h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

async function connectGoogleAccount(studioSlug: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const next = `/${studioSlug}/studio/config/account?success=true`;
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  return { error: error?.message ?? null };
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [perfil, setPerfil] = useState<PerfilData | null>(initialPerfil);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState('');
  const { googleOnly, hasGoogle, hasPassword } = authIdentities;

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      router.replace(`/${studioSlug}/studio/config/account`, { scroll: false });
      router.refresh();
    }
  }, [studioSlug, searchParams, router]);

  const handleConnectGoogle = async () => {
    setGoogleError('');
    setGoogleConnecting(true);
    const { error } = await connectGoogleAccount(studioSlug);
    if (error) {
      setGoogleError(error);
      setGoogleConnecting(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    setUnlinkError('');
    setUnlinkLoading(true);
    const result = await unlinkGoogleIdentity(studioSlug);
    setUnlinkLoading(false);
    if (result.success) {
      setUnlinkModalOpen(false);
      router.refresh();
    } else {
      setUnlinkError(result.error);
    }
  };

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

        {/* Estado de proveedores: Google */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          {hasGoogle ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-emerald-400 font-medium flex items-center gap-2">
                <span aria-hidden>✅</span> Cuenta de Google conectada
              </p>
              <div className="flex items-center gap-2">
                {googleOnly ? (
                  <span
                    className="text-xs text-zinc-500"
                    title="No puedes desconectar Google porque es tu único método de acceso. Crea una contraseña primero."
                  >
                    No puedes desconectar Google porque es tu único método de acceso. Crea una contraseña primero.
                  </span>
                ) : (
                  <ZenButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUnlinkModalOpen(true)}
                    className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    Desconectar
                  </ZenButton>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <ZenButton
                type="button"
                variant="outline"
                onClick={handleConnectGoogle}
                disabled={googleConnecting}
                loading={googleConnecting}
                loadingText="Conectando con Google..."
              >
                <GoogleLogo />
                Conectar cuenta de Google
              </ZenButton>
              {googleError && (
                <p className="text-sm text-red-400">{googleError}</p>
              )}
            </div>
          )}
        </div>

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
            {hasPassword && <PasswordChangeForm studioSlug={studioSlug} />}
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

      <ZenConfirmModal
        isOpen={unlinkModalOpen}
        onClose={() => !unlinkLoading && (setUnlinkModalOpen(false), setUnlinkError(''))}
        onConfirm={handleUnlinkGoogle}
        title="Desconectar cuenta de Google"
        description={
          <>
            Esto eliminará Google como método de acceso, pero tu estudio y suscripción seguirán vigentes. ¿Deseas continuar?
            {unlinkError && <p className="text-sm text-red-400 mt-2">{unlinkError}</p>}
          </>
        }
        confirmText="Desconectar"
        cancelText="Cancelar"
        variant="destructive"
        loading={unlinkLoading}
        loadingText="Desconectando..."
      />
    </div>
  );
}
