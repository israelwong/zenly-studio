"use client";

import { ZenButton } from "@/components/ui/zen";
import {
  Heart,
  Share2,
  MessageCircle,
  Calendar,
  MapPin,
  Phone,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { MediaItem } from "@/lib/actions/schemas/post-schemas";
import { ImageCarousel } from "@/components/shared/media";

interface PostRendererProps {
  post: {
    id: string;
    title: string | null;
    caption: string | null;
    media?: MediaItem[];
    published_at: Date | null;
    created_at: Date;
    view_count: number;
    tags: string[];
    event_type: { id: string; name: string } | null;
    cta_enabled: boolean;
    cta_action: string;
    cta_text: string;
    studio: {
      studio_name: string;
      whatsapp_number: string | null;
    };
  };
  studioSlug: string;
}

export function PostRenderer({ post, studioSlug }: PostRendererProps) {
  const media = Array.isArray(post.media) ? post.media : [];
  const hasMultipleMedia = media.length > 1;

  const handleCTAClick = () => {
    if (!post.cta_enabled) return;

    switch (post.cta_action) {
      case "whatsapp":
        if (post.studio.whatsapp_number) {
          const message = encodeURIComponent(
            `Hola! Vi tu post "${post.title}" y me interesa conocer más sobre tus servicios.`
          );
          window.open(
            `https://wa.me/${post.studio.whatsapp_number}?text=${message}`,
            "_blank"
          );
        } else {
          toast.error("Número de WhatsApp no disponible");
        }
        break;
      case "lead_form":
        toast.info("Formulario de contacto (por implementar)");
        break;
      case "calendar":
        toast.info("Sistema de citas (por implementar)");
        break;
      default:
        toast.error("Acción no disponible");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || "Post de fotografía",
          text: post.caption || "",
          url: window.location.href,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("URL copiada al portapapeles");
    }
  };

  return (
    <div className="max-w-md mx-auto bg-zinc-900 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
              <span className="text-zinc-300 font-semibold">
                {post.studio.studio_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="font-semibold text-zinc-100">
                {post.studio.studio_name}
              </h1>
              <p className="text-xs text-zinc-400">
                {new Date(post.published_at || post.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <Share2 className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Media */}
      {media.length > 0 ? (
        <div className="relative w-full">
          <ImageCarousel
            media={media}
            showArrows={hasMultipleMedia}
            showDots={hasMultipleMedia}
            autoplay={0}
            className="aspect-square"
          />
        </div>
      ) : (
        <div className="w-full aspect-square bg-zinc-800 flex items-center justify-center">
          <Calendar className="w-16 h-16 text-zinc-500" />
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <Heart className="w-6 h-6 text-zinc-400" />
            </button>
            <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <MessageCircle className="w-6 h-6 text-zinc-400" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
            >
              <Share2 className="w-6 h-6 text-zinc-400" />
            </button>
          </div>
          <span className="text-sm text-zinc-500">
            {post.view_count} vistas
          </span>
        </div>

        {/* Title and Caption */}
        <div className="space-y-2">
          {post.title && (
            <h2 className="font-semibold text-zinc-100 text-lg">
              {post.title}
            </h2>
          )}
          {post.caption && (
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {post.caption}
            </p>
          )}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="text-zinc-500 text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Event Type */}
        {post.event_type && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Calendar className="w-4 h-4" />
            <span>{post.event_type.name}</span>
          </div>
        )}

        {/* CTA Button */}
        {post.cta_enabled && post.cta_text && (
          <div className="pt-4">
            <ZenButton
              onClick={handleCTAClick}
              className="w-full"
              size="lg"
            >
              {post.cta_action === "whatsapp" && <Phone className="w-5 h-5 mr-2" />}
              {post.cta_action === "calendar" && <Calendar className="w-5 h-5 mr-2" />}
              {post.cta_action === "lead_form" && <MessageCircle className="w-5 h-5 mr-2" />}
              {post.cta_text}
            </ZenButton>
          </div>
        )}

        {/* Studio Info */}
        <div className="pt-4 border-t border-zinc-800 space-y-3">
          <h3 className="font-semibold text-zinc-100">
            {post.studio.studio_name}
          </h3>

          {post.studio.whatsapp_number && (
            <a
              href={`https://wa.me/${post.studio.whatsapp_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Contactar por WhatsApp
            </a>
          )}

          <a
            href={`/${studioSlug}`}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ver perfil completo
          </a>
        </div>
      </div>
    </div>
  );
}
