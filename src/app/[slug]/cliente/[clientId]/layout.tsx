import { redirect } from 'next/navigation';
import { getClienteSession, obtenerStudioPublicInfo } from '@/lib/actions/cliente';
import { ClientHeader } from './components/ClientHeader';
import { ClientFooter } from './components/ClientFooter';
import type { StudioPublicInfo } from '@/lib/actions/cliente';

interface ClienteLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string; clientId: string }>;
}

export default async function ClienteLayout({ children, params }: ClienteLayoutProps) {
  const { slug, clientId } = await params;

  // Si el clientId es "aviso-privacidad", redirigir a la ruta pública
  if (clientId === 'aviso-privacidad') {
    redirect(`/${slug}/aviso-privacidad`);
  }

  // Autenticación en servidor
  const cliente = await getClienteSession();

  if (!cliente) {
    redirect(`/${slug}/cliente/login`);
  }

  // Verificar que el clientId coincida con el cliente autenticado
  if (clientId !== cliente.id) {
    redirect(`/${slug}/cliente/${cliente.id}`);
  }

  // Cargar datos del studio (memoizado con React.cache)
  const studioInfo: StudioPublicInfo | null = await obtenerStudioPublicInfo(slug);

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      <ClientHeader slug={slug} cliente={cliente} studioInfo={studioInfo} />
      <main className="flex-1 min-h-0 overflow-hidden bg-zinc-900/40">
        {children}
      </main>
      <ClientFooter studioInfo={studioInfo} />
    </div>
  );
}
