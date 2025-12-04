import { notFound } from "next/navigation";
import { getStudioPostById, incrementPostViewCount } from "@/lib/actions/studio/posts";
import { PostRenderer } from "@/components/posts/PostRenderer";

interface PublicPostPageProps {
  params: Promise<{
    slug: string;
    postId: string;
  }>;
}

export default async function PublicPostPage({ params }: PublicPostPageProps) {
  const { slug, postId } = await params;

  // Obtener el post
  const postResult = await getStudioPostById(postId);

  if (!postResult.success || !postResult.data) {
    notFound();
  }

  const post = postResult.data;

  // Verificar que el post esté publicado
  if (!post.is_published) {
    notFound();
  }

  // Incrementar contador de vistas (no bloquea la renderización)
  incrementPostViewCount(postId);

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
