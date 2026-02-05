import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { obtenerAvisoPrivacidadPublico } from '@/lib/actions/public/promesas.actions';
import { MarkdownPreview } from '@/components/shared/avisos-privacidad/MarkdownPreview';
import { ZenCard, ZenCardContent, ZenCardHeader } from '@/components/ui/zen';
import { Shield } from 'lucide-react';
import { AvisoPrivacidadFooter } from './components/AvisoPrivacidadFooter';
import { obtenerStudioPublicInfo } from '@/lib/actions/cliente';
import { ProfileHeader } from '@/components/profile/ProfileHeader';

interface AvisoPrivacidadPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generar metadata para SEO y título de pestaña
 */
export async function generateMetadata({ params }: AvisoPrivacidadPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const studioInfo = await obtenerStudioPublicInfo(slug);

    if (!studioInfo) {
      return {
        title: 'Aviso de Privacidad',
        description: 'El aviso de privacidad no está disponible',
      };
    }

    const title = `Aviso de Privacidad - ${studioInfo.studio_name}`;
    const description = `Aviso de privacidad de ${studioInfo.studio_name}`;

    // Configurar favicon dinámico usando el logo del studio
    const icons = studioInfo.logo_url ? {
      icon: [
        { url: studioInfo.logo_url, type: 'image/png' },
        { url: studioInfo.logo_url, sizes: '32x32', type: 'image/png' },
        { url: studioInfo.logo_url, sizes: '16x16', type: 'image/png' },
      ],
      apple: [
        { url: studioInfo.logo_url, sizes: '180x180', type: 'image/png' },
      ],
      shortcut: studioInfo.logo_url,
    } : undefined;

    return {
      title,
      description,
      icons,
      openGraph: {
        title,
        description,
        type: 'website',
      },
    };
  } catch (error) {
    console.error('[generateMetadata] Error:', error);
    return {
      title: 'Aviso de Privacidad',
      description: 'El aviso de privacidad no está disponible',
    };
  }
}

export default async function AvisoPrivacidadPage({ params }: AvisoPrivacidadPageProps) {
  const { slug } = await params;
  const [result, studioInfo] = await Promise.all([
    obtenerAvisoPrivacidadPublico(slug),
    obtenerStudioPublicInfo(slug),
  ]);

  // Si el studio no existe, redirigir a root
  if (!result.success || !studioInfo) {
    redirect('/');
  }

  // Si no hay aviso activo, mostrar mensaje
  if (!result.data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <header className="sticky top-0 z-50">
          <ProfileHeader
            data={{
              studio_name: studioInfo.studio_name,
              logo_url: studioInfo.logo_url,
            }}
            studioSlug={slug}
            isEditMode={false}
          />
        </header>
        <main className="flex-1 overflow-auto bg-zinc-900/40 py-12 px-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <ZenCard>
              <ZenCardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-zinc-500" />
                </div>
              </ZenCardHeader>
              <ZenCardContent>
                <p className="text-zinc-400">
                  El aviso de privacidad no está disponible en este momento.
                </p>
              </ZenCardContent>
            </ZenCard>
          </div>
        </main>
        <AvisoPrivacidadFooter studioInfo={studioInfo} />
      </div>
    );
  }

  const aviso = result.data as {
    id: string;
    title: string;
    content: string;
    version: string;
    updated_at: Date;
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="sticky top-0 z-50">
        <ProfileHeader
          data={{
            studio_name: studioInfo.studio_name,
            logo_url: studioInfo.logo_url,
          }}
          studioSlug={slug}
          isEditMode={false}
        />
      </header>
      <main className="flex-1 overflow-auto bg-zinc-900/40 py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <ZenCard>
            <ZenCardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                <span>v{aviso.version}</span>
                {aviso.updated_at && (
                  <span>
                    Actualizado: {new Date(aviso.updated_at).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </ZenCardHeader>
            <ZenCardContent>
              <div className="prose prose-invert max-w-none">
                <MarkdownPreview content={aviso.content} />
              </div>
            </ZenCardContent>
          </ZenCard>
        </div>
      </main>
      <AvisoPrivacidadFooter studioInfo={studioInfo} />
    </div>
  );
}

