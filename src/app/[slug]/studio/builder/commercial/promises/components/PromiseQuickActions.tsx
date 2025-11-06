'use client';

import React from 'react';
import { Share2, MessageCircle, Phone, ExternalLink } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

interface PromiseQuickActionsProps {
  studioSlug: string;
  contactId: string;
  contactName: string;
  phone: string;
  email?: string | null;
}

export function PromiseQuickActions({
  studioSlug,
  contactId,
  contactName,
  phone,
  email,
}: PromiseQuickActionsProps) {
  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Hola ${contactName}, te contacto desde ZEN`);
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleCall = () => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleShareProfile = () => {
    // TODO: Implementar compartir perfil digital
    const profileUrl = `${window.location.origin}/${studioSlug}/cliente/profile/${contactId}`;
    if (navigator.share) {
      navigator.share({
        title: `Perfil de ${contactName}`,
        text: `Revisa el perfil de ${contactName}`,
        url: profileUrl,
      });
    } else {
      navigator.clipboard.writeText(profileUrl);
      // toast.success('Link copiado al portapapeles');
    }
  };

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-zinc-900/30 rounded-lg border border-zinc-800">
      <ZenButton
        variant="outline"
        size="sm"
        onClick={handleWhatsApp}
        className="flex items-center gap-2"
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </ZenButton>
      <ZenButton
        variant="outline"
        size="sm"
        onClick={handleCall}
        className="flex items-center gap-2"
      >
        <Phone className="h-4 w-4" />
        Llamar
      </ZenButton>
      <ZenButton
        variant="outline"
        size="sm"
        onClick={handleShareProfile}
        className="flex items-center gap-2"
      >
        <Share2 className="h-4 w-4" />
        Compartir Perfil
      </ZenButton>
      {email && (
        <ZenButton
          variant="outline"
          size="sm"
          onClick={() => window.open(`mailto:${email}`, '_self')}
          className="flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Email
        </ZenButton>
      )}
    </div>
  );
}

