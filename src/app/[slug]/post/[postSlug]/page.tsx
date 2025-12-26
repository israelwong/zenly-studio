import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStudioPostBySlug, incrementPostViewCount } from "@/lib/actions/studio/posts";
import { PostRenderer } from "@/components/posts/PostRenderer";
import { obtenerStudioPublicInfo } from "@/lib/actions/cliente";

interface PublicPostPageProps {
  params: Promise<{
    slug: string;
    postSlug: string;
  }>;
}

export async function generateMetadata({ params }: PublicPostPageProps): Promise<Metadata> {
  const { slug, postSlug } = await params;

  try {
    const postResult = await getStudioPostBySlug(slug, postSlug);

    if (!postResult.success || !postResult.data) {
      return {
        title: 'Post no encontrado',
        description: 'El post solicitado no está disponible',
      };
    }

    const post = postResult.data;
    const studioInfo = await obtenerStudioPublicInfo(slug);

    const title = studioInfo?.studio_name
      ? `${post.title || 'Post'} - ${studioInfo.studio_name}`
      : post.title || 'Post';
    const description = post.caption || 
      (studioInfo?.studio_name
        ? `Post de ${studioInfo.studio_name}`
        : 'Post del estudio');

    const icons = studioInfo?.logo_url ? {
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

    // Obtener primera imagen del post para OpenGraph
    const firstImage = post.media && post.media.length > 0 
      ? post.media[0].file_url 
      : studioInfo?.logo_url;

    return {
      title,
      description,
      icons,
      openGraph: {
        title,
        description,
        images: firstImage ? [firstImage] : undefined,
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: firstImage ? [firstImage] : undefined,
      },
    };
  } catch (error) {
    console.error('[generateMetadata] Error:', error);
    return {
      title: 'Post no encontrado',
      description: 'El post solicitado no está disponible',
    };
  }
}

export default async function PublicPostPage({ params }: PublicPostPageProps) {
  const { slug, postSlug } = await params;

  // Obtener el post por slug
  const postResult = await getStudioPostBySlug(slug, postSlug);

  if (!postResult.success || !postResult.data) {
    notFound();
  }

  const post = postResult.data;

  // Verificar que el post esté publicado
  if (!post.is_published) {
    notFound();
  }

  // Incrementar contador de vistas (no bloquea la renderización)
  incrementPostViewCount(postSlug, slug);

  // Agregar campos CTA por defecto si no existen
  const postWithCTA = {
    ...post,
    cta_enabled: false,
    cta_action: '',
    cta_text: '',
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <PostRenderer post={postWithCTA} studioSlug={slug} />
    </div>
  );
}
