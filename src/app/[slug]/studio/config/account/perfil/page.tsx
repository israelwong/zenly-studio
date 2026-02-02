import { redirect } from 'next/navigation';

interface PerfilRedirectProps {
  params: Promise<{ slug: string }>;
}

/** Redirige a la vista unificada Cuenta (/config/account). */
export default async function PerfilRedirectPage({ params }: PerfilRedirectProps) {
  const { slug } = await params;
  redirect(`/${slug}/studio/config/account`);
}
