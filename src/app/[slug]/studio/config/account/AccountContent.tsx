'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createClient, getOAuthOrigin } from '@/lib/supabase/browser';
import type { AuthIdentities } from '@/lib/actions/studio/account/auth-identities';
import type { PerfilData } from './types';
import {
  PerfilForm,
  PerfilSkeleton,
  PasswordChangeForm,
  SetPasswordForm,
  SecuritySettings,
  SessionsHistory,
} from './components';
import { ZenButton, ZenConfirmModal, ZenDialog } from '@/components/ui/zen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { unlinkGoogleIdentity } from '@/lib/actions/studio/account/auth-identities';
import { establecerPassword } from '@/lib/actions/studio/account/seguridad/seguridad.actions';
import type { SetPasswordForm as SetPasswordFormDataType } from '@/lib/actions/schemas/seguridad/seguridad-schemas';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const GoogleLogo = ({ className }: { className?: string }) => (
  <svg className={cn('flex-shrink-0', className)} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

/**
 * Conecta la cuenta de Google al usuario actual (link identity).
 * No usar signInWithOAuth: crearía otra sesión/usuario. linkIdentity mantiene al usuario actual.
 * No llamar signOut antes: rompería el contexto necesario para vincular.
 */
async function connectGoogleAccount(
  studioSlug: string,
  returnPath: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !user) {
    return { error: 'Debes tener sesión iniciada para conectar Google. Vuelve a iniciar sesión.' };
  }

  const origin = getOAuthOrigin();
  const pathWithSearch = returnPath.includes('?') ? `${returnPath}&success=true` : `${returnPath}?success=true`;
  const next = pathWithSearch.startsWith('/') ? pathWithSearch : `/${studioSlug}/studio/config/account?success=true`;
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.linkIdentity({
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [perfil, setPerfil] = useState<PerfilData | null>(initialPerfil);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState('');
  const { googleOnly, hasGoogle, hasPassword, googleEmail } = authIdentities;
  const needsPasswordToUnlink = hasGoogle && !hasPassword;

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      router.replace(`/${studioSlug}/studio/config/account`, { scroll: false });
      router.refresh();
    }
  }, [studioSlug, searchParams, router]);

  useEffect(() => {
    const errorCode = searchParams.get('error_code');
    if (errorCode === 'identity_already_exists') {
      toast.error(
        'No se pudo vincular: Esta cuenta de Google ya está registrada como un usuario independiente. Si deseas unificarlas, primero debes eliminar la otra cuenta o contactar soporte.'
      );
      const cleanPath = `/${studioSlug}/studio/config/account`;
      router.replace(cleanPath, { scroll: false });
    }
  }, [searchParams, studioSlug, router]);

  const handleConnectGoogle = async () => {
    setGoogleError('');
    setGoogleConnecting(true);
    const returnPath = pathname ?? `/${studioSlug}/studio/config/account`;
    const { error } = await connectGoogleAccount(studioSlug, returnPath);
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
      setDisconnectModalOpen(false);
      router.refresh();
    } else {
      setUnlinkError(result.error ?? '');
    }
  };

  const handleDisconnectClick = () => setDisconnectModalOpen(true);
  const handleCloseDisconnectModal = () => {
    if (!unlinkLoading) {
      setDisconnectModalOpen(false);
      setUnlinkError('');
    }
  };
  const handlePasswordSetSuccess = () => {
    setDisconnectModalOpen(false);
    setUnlinkError('');
    router.refresh();
  };

  /** Secuencia estricta: 1) establecer contraseña, 2) solo si OK desvincular Google. Evita race condition. */
  const handleSetPasswordThenUnlink = async (
    data: SetPasswordFormDataType
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    const passwordResult = await establecerPassword(studioSlug, data);
    if (!passwordResult.success) {
      return { success: false, error: passwordResult.error };
    }
    const unlinkResult = await unlinkGoogleIdentity(studioSlug);
    if (!unlinkResult.success) {
      return { success: false, error: unlinkResult.error };
    }
    return {
      success: true,
      message: 'Contraseña establecida y cuenta de Google desvinculada. Inicia sesión con tu correo y contraseña.',
    };
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

      {/* Sección 2: Seguridad y Acceso — Card unificada */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white border-b border-zinc-800 pb-2">
          Seguridad y Acceso
        </h2>

        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800/80 pb-4">
            <CardTitle className="text-base font-semibold text-white">
              Proveedores de acceso
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Fila Google: título/email + badge + botón */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  {hasGoogle ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <GoogleLogo className="h-5 w-5 shrink-0" />
                        <span className="font-semibold text-white">Google</span>
                        <Badge variant="outline" className="border-emerald-600/50 bg-emerald-950/40 text-emerald-400 text-xs font-medium">
                          Conectado
                        </Badge>
                      </div>
                      {googleEmail && (
                        <p className="text-sm text-zinc-400 truncate mt-0.5">{googleEmail}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-zinc-400">Conecta tu cuenta de Google para iniciar sesión con un clic.</p>
                      {initialPerfil?.email && (
                        <p className="text-xs text-zinc-500 mt-1.5">
                          Tu cuenta actual: <span className="text-zinc-400">{initialPerfil.email}</span>. Si conectas una cuenta de Google con otro correo, podría crearse una cuenta separada según la configuración del proyecto.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
              {hasGoogle ? (
                <ZenButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectClick}
                  className="shrink-0 border-red-900/60 text-red-300 hover:bg-red-950/40 hover:border-red-800 hover:text-red-200"
                >
                  Desconectar
                </ZenButton>
              ) : (
                <ZenButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleConnectGoogle}
                  disabled={googleConnecting}
                  loading={googleConnecting}
                  loadingText="Conectando..."
                  className="shrink-0"
                >
                  <GoogleLogo className="h-4 w-4 mr-1.5" />
                  Conectar cuenta de Google
                </ZenButton>
              )}
            </div>

            {/* Alerta integrada (solo Google): texto sutil dentro de la misma card */}
            {googleOnly && (
              <div className="flex items-start gap-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/50 p-3">
                <Info className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                <p className="text-sm text-zinc-400">
                  Tu acceso está gestionado por Google. Si quieres desconectar, haz clic en Desconectar y crea una contraseña para seguir accediendo con tu correo.
                </p>
              </div>
            )}

            {googleError && (
              <p className="text-sm text-red-400">{googleError}</p>
            )}
          </CardContent>
        </Card>

        {googleOnly ? (
          <div className="mt-4">
            <SecuritySettings studioSlug={studioSlug} />
          </div>
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

      {/* Modal: crear contraseña primero (solo si no tiene contraseña) */}
      <ZenDialog
        isOpen={disconnectModalOpen && needsPasswordToUnlink}
        onClose={handleCloseDisconnectModal}
        title="Crea una contraseña primero"
        description="Para desconectar tu cuenta de Google, necesitas definir una contraseña para seguir accediendo con tu correo."
        maxWidth="md"
        showCloseButton
      >
        <SetPasswordForm
          studioSlug={studioSlug}
          variant="inline"
          onSuccess={handlePasswordSetSuccess}
          onSubmitToServer={handleSetPasswordThenUnlink}
        />
      </ZenDialog>

      {/* Modal: confirmar desvincular (cuando ya tiene contraseña) */}
      <ZenConfirmModal
        isOpen={disconnectModalOpen && hasPassword}
        onClose={handleCloseDisconnectModal}
        onConfirm={handleUnlinkGoogle}
        title="Desvincular cuenta"
        description={
          <>
            Estás a punto de desvincular Google. Seguirás teniendo acceso usando tu correo y contraseña.
            {unlinkError && <p className="text-sm text-red-400 mt-2">{unlinkError}</p>}
          </>
        }
        confirmText="Confirmar Desconexión"
        cancelText="Cancelar"
        variant="destructive"
        loading={unlinkLoading}
        loadingText="Desconectando..."
      />
    </div>
  );
}
