import { notFound } from "next/navigation";
import { getStudioPostBySlug, incrementPostViewCount } from "@/lib/actions/studio/posts";
import { PostRenderer } from "@/components/posts/PostRenderer";

interface PublicPostPageProps {
  params: Promise<{
    slug: string;
    postSlug: string;
  }>;
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
