import { redirect } from 'next/navigation';
import { getClienteSession, obtenerStudioPublicInfo } from '@/lib/actions/public/cliente';
import { ClientHeaderSimple } from './components/ClientHeaderSimple';
import type { StudioPublicInfo } from '@/lib/actions/public/cliente';

interface ClienteLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string; clientId: string }>;
}

export default async function ClienteLayout({ children, params }: ClienteLayoutProps) {
  const { slug, clientId } = await params;

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
    <div className="min-h-screen bg-zinc-950 flex flex-col overflow-hidden">
      <ClientHeaderSimple slug={slug} cliente={cliente} studioInfo={studioInfo} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-zinc-900/40">
        {children}
      </main>
    </div>
  );
}
