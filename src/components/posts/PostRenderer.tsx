"use client";

import React from "react";
import Image from "next/image";
import { ZenButton } from "@/components/ui/zen";
import {
  Calendar,
  Phone,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Link2,
  X,
  RotateCcw
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
    is_published?: boolean;
    cta_enabled: boolean;
    cta_action: string;
    cta_text: string;
    studio: {
      studio_name: string;
      logo_url?: string | null;
      whatsapp_number: string | null;
    };
  };
  studioSlug: string;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  onClose?: () => void;
  isArchived?: boolean;
  onRestore?: () => void;
}

export function PostRenderer({ post, studioSlug, onNext, onPrev, hasNext, hasPrev, onClose, isArchived = false, onRestore }: PostRendererProps) {
  const [linkCopied, setLinkCopied] = React.useState(false);

  // Filtrar media que tenga id definido (requerido por ImageCarousel)
  const media = Array.isArray(post.media)
    ? post.media.filter((m): m is MediaItem & { id: string } => !!m.id)
    : [];
  const hasMultipleMedia = media.length > 1;

  // Formato de fecha amigable
  const getFormattedDate = (date: Date | null): string => {
    if (!date) return 'Hoy';

    const postDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - postDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Hoy
    if (diffDays === 0) return 'Hoy';
    // Ayer
    if (diffDays === 1) return 'Ayer';
    // Menos de 7 días
    if (diffDays < 7) return `Hace ${diffDays} días`;
    // Fecha completa
    return postDate.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
        toast.info("Formulario de contacto (por implementar)");
        break;
      case "calendar":
        toast.info("Sistema de citas (por implementar)");
        break;
      default:
        toast.error("Acción no disponible");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      toast.success("Enlace copiado al portapapeles");

      // Resetear después de 2 segundos
      setTimeout(() => {
        setLinkCopied(false);
      }, 2000);
    } catch (error) {
      toast.error("Error al copiar el enlace");
    }
  };

  return (
    <div className="w-full flex flex-col bg-transparent overflow-hidden">
      {/* Header - Fixed con backdrop-blur */}
      <div className="flex-shrink-0 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar - Muestra logo si existe, sino inicial */}
            {post.studio.logo_url ? (
              <Image
                src={post.studio.logo_url}
                alt={post.studio.studio_name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
                <span className="text-zinc-300 font-semibold">
                  {post.studio.studio_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="font-semibold text-zinc-100">
                {post.studio.studio_name}
              </h1>
              <p className="text-xs text-zinc-400">
                {getFormattedDate(post.published_at || post.created_at)}
              </p>
            </div>
          </div>

          {/* Navigation and Close buttons */}
          <div className="flex items-center gap-2">
            {/* Navigation buttons - Solo si hay navegación disponible */}
            {(hasPrev || hasNext) && (
              <>
                <button
                  onClick={onPrev}
                  disabled={!hasPrev}
                  className={`p-2 rounded-full transition-colors ${hasPrev
                    ? 'hover:bg-zinc-800 text-zinc-400'
                    : 'text-zinc-700 cursor-not-allowed'
                    }`}
                  aria-label="Post anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  className={`p-2 rounded-full transition-colors ${hasNext
                    ? 'hover:bg-zinc-800 text-zinc-400'
                    : 'text-zinc-700 cursor-not-allowed'
                    }`}
                  aria-label="Siguiente post"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="h-5 w-px bg-zinc-700" />
              </>
            )}
            {/* Close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Media - Fixed, sin scroll */}
      {media.length > 0 ? (
        <div className="relative w-full flex-shrink-0 overflow-hidden">
          {!hasMultipleMedia && media[0] ? (
            // Una sola imagen/video: alto automático sin recortar
            media[0].file_type === 'image' ? (
              <Image
                src={media[0].file_url}
                alt={media[0].filename}
                width={800}
                height={800}
                className="w-full h-auto object-contain max-h-[50vh]"
                unoptimized
              />
            ) : (
              <video
                src={media[0].file_url}
                controls
                autoPlay
                muted
                loop
                playsInline
                poster={media[0].thumbnail_url}
                className="w-full h-auto object-contain max-h-[50vh]"
              />
            )
          ) : (
            // Múltiples items: carousel
            <ImageCarousel
              media={media}
              showArrows={true}
              showDots={true}
              autoplay={0}
              className="aspect-square"
            />
          )}
        </div>
      ) : (
        <div className="w-full aspect-square flex-shrink-0 bg-zinc-800 flex items-center justify-center">
          <Calendar className="w-16 h-16 text-zinc-500" />
        </div>
      )}

      {/* Content - Con scroll interno solo si excede altura */}
      <div className="flex-shrink-0 max-h-[40vh] overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {/* Actions - Minimalista */}
        <div className="flex items-center justify-between">
          {/* Vistas */}
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Eye className="w-4 h-4" />
            <span>{post.view_count} vistas</span>
          </div>

          {/* Botón condicional: Restaurar o Copiar link */}
          {isArchived && onRestore ? (
            <button
              onClick={onRestore}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-full transition-colors text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
            >
              <RotateCcw className="w-4 h-4" />
              Restaurar
            </button>
          ) : (
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-full transition-colors ${linkCopied
                ? 'text-emerald-400 bg-emerald-950/50'
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
                }`}
            >
              <Link2 className="w-4 h-4" />
              {linkCopied ? 'Link copiado' : 'Copiar link'}
            </button>
          )}
        </div>

        {/* Title and Caption */}
        <div className="space-y-2">
          {post.title && (
            <h2 className="font-semibold text-zinc-100 text-lg">
              {post.title}
            </h2>
          )}
          {post.caption && (
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
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
      </div>
    </div>
  );
}
