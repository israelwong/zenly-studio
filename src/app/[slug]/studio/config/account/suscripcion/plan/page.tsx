import { redirect } from 'next/navigation';

interface PlanRedirectProps {
  params: Promise<{ slug: string }>;
}

/** Redirige a /config/suscripcion/plan. */
export default async function PlanRedirectPage({ params }: PlanRedirectProps) {
  const { slug } = await params;
  redirect(`/${slug}/studio/config/suscripcion/plan`);
}
