'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardFooter, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { createClient } from '@/lib/supabase/browser';
import { Construction, LogOut, LayoutDashboard, Home } from 'lucide-react';

export default function SetupStudioPage() {
  const router = useRouter();
  const [studioSlug, setStudioSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const slug = user?.user_metadata?.studio_slug;
      setStudioSlug(typeof slug === 'string' && slug.trim() ? slug.trim() : null);
      setLoading(false);
    });
  }, []);

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
              Configuración de Estudio
            </ZenCardTitle>
            <p className="mt-1 text-sm font-normal text-amber-500/90">En construcción</p>
          </ZenCardHeader>
          <ZenCardContent className="text-center">
            <p className="text-zinc-400">
              Esta funcionalidad está en construcción o no disponible para tu cuenta actual.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Si ya tienes un estudio, usa el botón inferior para ir a tu panel.
            </p>
          </ZenCardContent>
          <ZenCardFooter className="flex flex-col gap-3 pt-2">
            {!loading && (
              <>
                {studioSlug ? (
                  <ZenButton asChild variant="primary" className="w-full">
                    <Link href={`/${studioSlug}/studio/commercial/dashboard`}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Ir a mi Dashboard
                    </Link>
                  </ZenButton>
                ) : (
                  <ZenButton asChild variant="secondary" className="w-full">
                    <Link href="/">
                      <Home className="mr-2 h-4 w-4" />
                      Volver al Inicio
                    </Link>
                  </ZenButton>
                )}
                <ZenButton
                  type="button"
                  variant="outline"
                  className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </ZenButton>
              </>
            )}
            {loading && (
              <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-800" />
            )}
          </ZenCardFooter>
        </ZenCard>
      </div>
    </div>
  );
}
