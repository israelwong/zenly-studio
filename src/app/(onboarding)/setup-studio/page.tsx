'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { createStudioAndSubscription } from '@/lib/actions/auth/signup.actions';
import { ZenButton, ZenInput, ZenCard } from '@/components/ui/zen';

export default function SetupStudioPage() {
  const router = useRouter();
  const [studioName, setStudioName] = useState('');
  const [studioSlug, setStudioSlug] = useState('');
  const [studioSlogan, setStudioSlogan] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Generar slug automático desde el nombre
  const handleNameChange = (value: string) => {
    setStudioName(value);
    if (!studioSlug || studioSlug === generateSlug(studioName)) {
      setStudioSlug(generateSlug(value));
    }
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No se pudo obtener usuario autenticado');
      }

      const result = await createStudioAndSubscription(user.id, {
        studio_name: studioName,
        studio_slug: studioSlug,
        studio_slogan: studioSlogan || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Error al crear estudio');
      }

      if (result.studio_slug) {
        // Redirigir a dashboard del nuevo studio
        router.push(`/${result.studio_slug}/studio`);
      } else {
        throw new Error('No se recibió slug del estudio');
      }
    } catch (err) {
      console.error('Setup studio error:', err);
      setError(err instanceof Error ? err.message : 'Error al crear estudio');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">
            Configura tu Estudio
          </h1>
          <p className="text-zinc-400">
            Crea tu espacio personalizado en ZEN
          </p>
        </div>

        <ZenCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <ZenInput
              label="Nombre del Estudio"
              type="text"
              value={studioName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej: Fotografía Luna"
              required
              error={error && error.includes('nombre') ? error : undefined}
              hint="Este nombre aparecerá en tu perfil público"
            />

            <ZenInput
              label="URL del Estudio"
              type="text"
              value={studioSlug}
              onChange={(e) => {
                const slug = generateSlug(e.target.value);
                setStudioSlug(slug);
              }}
              placeholder="fotografia-luna"
              required
              error={error && error.includes('slug') ? error : undefined}
              hint="Solo minúsculas, números y guiones. Ej: zen.pro/tu-slug"
            />

            <ZenInput
              label="Slogan (Opcional)"
              type="text"
              value={studioSlogan}
              onChange={(e) => setStudioSlogan(e.target.value)}
              placeholder="Ej: Capturando momentos únicos"
              hint="Una frase que describa tu estudio"
            />

            {error && !error.includes('nombre') && !error.includes('slug') && (
              <div className="text-sm text-red-400 bg-red-950/20 p-3 rounded border border-red-900/20">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <ZenButton
                type="submit"
                variant="primary"
                loading={loading}
                loadingText="Creando estudio..."
                className="flex-1"
              >
                Crear Estudio
              </ZenButton>
            </div>
          </form>
        </ZenCard>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Al continuar, aceptas nuestros términos de servicio y política de
          privacidad
        </p>
      </div>
    </div>
  );
}

