import { Metadata } from 'next';
import { PersonelPageClient } from './PersonelPageClient';

export const metadata: Metadata = {
  title: 'Zenly Studio - Personal',
  description: 'Gestiona tu equipo de trabajo',
};

interface PersonelPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PersonelPage({ params }: PersonelPageProps) {
  const { slug } = await params;
  return <PersonelPageClient studioSlug={slug} />;
}

