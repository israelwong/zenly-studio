'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { PromiseNotesButton } from './PromiseNotesButton';

interface PromiseToolbarProps {
  studioSlug: string;
  promiseId: string | null;
  contactData: {
    contactId: string;
  } | null;
  onCopyLink: () => void;
  onPreview: () => void;
}

export function PromiseToolbar({
  studioSlug,
  promiseId,
  contactData,
  onCopyLink,
  onPreview,
}: PromiseToolbarProps) {
  const [linkCopied, setLinkCopied] = useState(false);

  if (!promiseId || !contactData) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-1.5 px-6 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center gap-1.5">
        {/* Botón Copiar URL */}
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={() => {
            onCopyLink();
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
          }}
          className={`gap-1.5 px-2.5 py-1.5 h-7 text-xs ${linkCopied ? 'bg-emerald-500/20 text-emerald-400' : ''}`}
        >
          {linkCopied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copiar URL</span>
            </>
          )}
        </ZenButton>

        {/* Botón Vista previa */}
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={onPreview}
          className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Vista previa</span>
        </ZenButton>
      </div>

      {/* Botón de bitácora alineado a la derecha */}
      <PromiseNotesButton
        studioSlug={studioSlug}
        promiseId={promiseId}
        contactId={contactData.contactId}
      />
    </div>
  );
}

