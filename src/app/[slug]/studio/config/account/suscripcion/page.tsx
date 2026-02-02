import { redirect } from 'next/navigation';

interface SuscripcionRedirectProps {
  params: Promise<{ slug: string }>;
}

/** Redirige a la ruta unificada Suscripción (/config/suscripcion). */
export default async function SuscripcionRedirectPage({ params }: SuscripcionRedirectProps) {
  const { slug } = await params;
  redirect(`/${slug}/studio/config/suscripcion`);
}
