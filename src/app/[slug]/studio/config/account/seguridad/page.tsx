import { redirect } from 'next/navigation';

interface SeguridadRedirectProps {
  params: Promise<{ slug: string }>;
}

/** Redirige a la vista unificada Cuenta (/config/account). */
export default async function SeguridadRedirectPage({ params }: SeguridadRedirectProps) {
  const { slug } = await params;
  redirect(`/${slug}/studio/config/account`);
}
