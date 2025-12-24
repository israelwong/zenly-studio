import { notFound } from 'next/navigation';
import { obtenerAvisoPrivacidadPublico } from '@/lib/actions/public/promesas.actions';
import { MarkdownPreview } from '@/components/shared/terminos-condiciones/MarkdownPreview';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Shield } from 'lucide-react';

interface AvisoPrivacidadPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AvisoPrivacidadPage({ params }: AvisoPrivacidadPageProps) {
  const { slug } = await params;
  const result = await obtenerAvisoPrivacidadPublico(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const aviso = result.data;

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <ZenCard>
          <ZenCardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-emerald-500" />
              <ZenCardTitle>{aviso.title}</ZenCardTitle>
            </div>
            <p className="text-sm text-zinc-400 mt-2">Versión: {aviso.version}</p>
          </ZenCardHeader>
          <ZenCardContent>
            <div className="prose prose-invert max-w-none">
              <MarkdownPreview content={aviso.content} />
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    </div>
  );
}

