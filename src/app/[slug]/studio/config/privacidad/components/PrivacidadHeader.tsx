'use client';

import React from 'react';
import { Shield, FileText } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';

export interface PrivacidadHeaderProps {
  activeAviso: any;
  onManageClick: () => void;
  content: React.ReactNode;
}

export function PrivacidadHeader({ activeAviso, onManageClick, content }: PrivacidadHeaderProps) {
  return (
    <ZenCard variant="default" padding="none">
      <ZenCardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/20 rounded-lg">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <ZenCardTitle>Aviso de Privacidad</ZenCardTitle>
              <ZenCardDescription>
                Gestiona el aviso de privacidad de tu estudio (requerido por LFPDPPP en México)
              </ZenCardDescription>
            </div>
          </div>
          <ZenButton
            variant="primary"
            size="sm"
            onClick={onManageClick}
            icon={FileText}
          >
            {activeAviso ? 'Editar Aviso' : 'Gestionar Aviso'}
          </ZenButton>
        </div>
      </ZenCardHeader>
      {content}
    </ZenCard>
  );
}

