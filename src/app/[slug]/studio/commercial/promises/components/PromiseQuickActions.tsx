'use client';

import React, { useState } from 'react';
import { Eye, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  logProfileShared,
} from '@/lib/actions/studio/commercial/promises';

interface PromiseQuickActionsProps {
  studioSlug: string;
  contactId: string;
  contactName: string;
  phone: string;
  email?: string | null;
  promiseId?: string | null;
}

export function PromiseQuickActions({
  studioSlug,
  contactId,
  contactName,
  phone: _phone,
  email,
  promiseId,
}: PromiseQuickActionsProps) {
  const [linkCopied, setLinkCopied] = useState(false);

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/${studioSlug}/client/profile/${contactId}`;

    // Registrar log si hay promiseId
    if (promiseId) {
      logProfileShared(studioSlug, promiseId, contactName, profileUrl).catch((error) => {
        console.error('Error registrando perfil compartido:', error);
      });
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Perfil de ${contactName}`,
          text: `Revisa el perfil de ${contactName}`,
          url: profileUrl,
        });
      } catch (error) {
        // Usuario canceló el share
      }
    } else {
      await navigator.clipboard.writeText(profileUrl);
      toast.success('Link copiado al portapapeles');
    }
  };

  const handleCopyLink = async () => {
    if (!promiseId) {
      toast.error('La promesa debe estar guardada para copiar el link');
      return;
    }

    const previewUrl = `${window.location.origin}/${studioSlug}/promise/${promiseId}`;

    try {
      await navigator.clipboard.writeText(previewUrl);
      setLinkCopied(true);
      setTimeout(() => {
        setLinkCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Error copiando link:', error);
      toast.error('Error al copiar el link');
    }
  };

  const handlePreview = () => {
    if (!promiseId) {
      toast.error('La promesa debe estar guardada para ver la vista previa');
      return;
    }

    const previewUrl = `${window.location.origin}/${studioSlug}/promise/${promiseId}`;

    // Registrar log
    logProfileShared(studioSlug, promiseId, contactName, previewUrl).catch((error) => {
      console.error('Error registrando promesa compartida:', error);
    });

    // Abrir en nueva ventana
    window.open(previewUrl, '_blank');
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopyLink}
        className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${linkCopied
          ? 'bg-emerald-600/10 text-emerald-400'
          : 'bg-zinc-600/10 hover:bg-zinc-600/20 text-zinc-400 hover:text-zinc-300'
          }`}
        title={linkCopied ? 'Link copiado' : 'Copiar link'}
        aria-label={linkCopied ? 'Link copiado' : 'Copiar link'}
        disabled={!promiseId}
      >
        {linkCopied ? (
          <>
            <Check className="h-4 w-4" />
            <span>Link copiado</span>
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            <span>Copiar link</span>
          </>
        )}
      </button>
      <button
        onClick={handlePreview}
        className="px-3 py-2 rounded-lg bg-zinc-600/10 hover:bg-zinc-600/20 text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-2 text-sm"
        title="Vista previa"
        aria-label="Vista previa"
        disabled={!promiseId}
      >
        <Eye className="h-4 w-4" />
        <span>Vista previa</span>
      </button>
    </div>
  );
}

