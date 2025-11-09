"use client";

import { useState } from "react";
import Image from "next/image";
import { ZenButton } from "@/components/ui/zen";
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
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
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const media = Array.isArray(post.media) ? post.media : [];
  const currentMedia = media[currentMediaIndex];

  const nextMedia = () => {
    if (currentMediaIndex < media.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1);
    }
  };

  const prevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
    }
  };

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
        // TODO: Abrir formulario de leads
        toast.info("Formulario de contacto (por implementar)");
        break;
      case "calendar":
        // TODO: Abrir calendario de citas
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
      // Fallback: copiar URL al clipboard
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
      <div className="relative aspect-square bg-zinc-800">
        {currentMedia ? (
          <>
            {currentMedia.type === "image" ? (
              <Image
                src={currentMedia.url}
                alt={post.title || "Post"}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full relative">
                <video
                  src={currentMedia.url}
                  className="w-full h-full object-cover"
                  controls
                  poster={currentMedia.thumbnail_url}
                />
              </div>
            )}

            {/* Navigation Arrows */}
            {media.length > 1 && (
              <>
                {currentMediaIndex > 0 && (
                  <button
                    onClick={prevMedia}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                )}
                {currentMediaIndex < media.length - 1 && (
                  <button
                    onClick={nextMedia}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                )}
              </>
            )}

            {/* Media Indicators */}
            {media.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                {media.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMediaIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentMediaIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500">
            <Calendar className="w-16 h-16" />
          </div>
        )}
      </div>

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
            <p className="text-zinc-300 leading-relaxed">
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
                className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full"
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

        {/* CTA */}
        {post.cta_enabled && (
          <div className="pt-4 border-t border-zinc-800">
            <ZenButton
              onClick={handleCTAClick}
              className="w-full gap-2"
              size="lg"
            >
              {post.cta_action === "whatsapp" && <Phone className="w-5 h-5" />}
              {post.cta_action === "lead_form" && <ExternalLink className="w-5 h-5" />}
              {post.cta_action === "calendar" && <Calendar className="w-5 h-5" />}
              {post.cta_text}
            </ZenButton>
          </div>
        )}

        {/* Studio Info */}
        <div className="pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
              <span className="text-zinc-300 font-semibold text-lg">
                {post.studio.studio_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-zinc-100">
                {post.studio.studio_name}
              </h3>
              <p className="text-sm text-zinc-400">
                Fotógrafo profesional
              </p>
            </div>
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
              Seguir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
