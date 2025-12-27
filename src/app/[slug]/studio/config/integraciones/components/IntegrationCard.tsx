'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenCardContent, ZenButton, ZenBadge } from '@/components/ui/zen';
import { cn } from '@/lib/utils';

export interface IntegrationCardProps {
  name: string;
  description: string;
  icon?: string; // URL del icono o nombre para inferir
  iconColor?: string;
  isConnected?: boolean;
  isComingSoon?: boolean;
  onConnect?: () => void;
  onManage?: () => void;
  connectLabel?: string;
  manageLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

const ICONS_BASE_URL = 'https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons';

const getIconUrl = (name: string, icon?: string): string => {
  // Si se proporciona un icono explícito, usarlo
  if (icon) {
    if (icon.startsWith('http')) return icon;
    return `${ICONS_BASE_URL}/${icon}`;
  }

  // Inferir icono basado en el nombre
  const nameLower = name.toLowerCase();

  if (nameLower.includes('calendar') || nameLower.includes('calendario')) {
    return `${ICONS_BASE_URL}/google-calendar.svg`;
  }
  if (nameLower.includes('drive') || nameLower.includes('google drive')) {
    return `${ICONS_BASE_URL}/google-drive-black.svg`;
  }
  if (nameLower.includes('manychat')) {
    return `${ICONS_BASE_URL}/Manychat_Black.png`;
  }
  if (nameLower.includes('stripe')) {
    return `${ICONS_BASE_URL}/stripe-icon.svg`;
  }
  if (nameLower.includes('zen magic') || nameLower.includes('magic')) {
    // ZEN Magic usa el icono Sparkles de Lucide (no hay URL)
    return 'lucide:sparkles';
  }

  // Default: google-drive-black.svg
  return `${ICONS_BASE_URL}/google-drive-black.svg`;
};

const getIconBgColor = (iconColor: string): string => {
  const colorMap: Record<string, string> = {
    'text-blue-400': 'bg-blue-600/20',
    'text-purple-400': 'bg-purple-600/20',
    'text-green-400': 'bg-green-600/20',
    'text-indigo-400': 'bg-indigo-600/20',
    'text-yellow-400': 'bg-yellow-600/20',
  };
  return colorMap[iconColor] || 'bg-zinc-600/20';
};

export function IntegrationCard({
  name,
  description,
  icon,
  iconColor = 'text-blue-400',
  isConnected = false,
  isComingSoon = false,
  onConnect,
  onManage,
  connectLabel = 'Conectar',
  manageLabel = 'Gestionar',
  className,
  children,
}: IntegrationCardProps) {
  const handleAction = () => {
    if (isComingSoon) return;
    if (isConnected && onManage) {
      onManage();
    } else if (!isConnected && onConnect) {
      onConnect();
    }
  };

  const iconUrl = getIconUrl(name, icon);
  const isSvg = iconUrl.endsWith('.svg');
  const isCalendar = name.toLowerCase().includes('calendar') || name.toLowerCase().includes('calendario');
  const isPng = iconUrl.endsWith('.png');
  const isLucideIcon = iconUrl.startsWith('lucide:');
  const isZenMagic = name.toLowerCase().includes('zen magic') || name.toLowerCase().includes('magic');

  return (
    <ZenCard className={cn('hover:border-zinc-700 transition-colors', isComingSoon && 'opacity-75', className)}>
      <ZenCardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn('p-2.5 rounded-lg flex items-center justify-center', getIconBgColor(iconColor))}>
              {isLucideIcon && isZenMagic ? (
                <Sparkles className={cn('h-6 w-6', iconColor || 'text-yellow-400')} />
              ) : (
                <img
                  src={iconUrl}
                  alt={name}
                  className={cn(
                    'h-6 w-6 object-contain',
                    // No aplicar filtro a Calendar (es de colores)
                    !isCalendar && isSvg && 'brightness-0 invert',
                    !isCalendar && isPng && 'brightness-0 invert'
                  )}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <ZenCardTitle className="text-base font-medium leading-none mb-0">{name}</ZenCardTitle>
                {isComingSoon && (
                  <ZenBadge variant="secondary" size="sm" className="rounded-full text-[10px] px-1.5 py-0.5">
                    Próximamente
                  </ZenBadge>
                )}
                {isConnected && !isComingSoon && (
                  <ZenBadge variant="success" size="sm" className="rounded-full text-[10px] px-1.5 py-0.5">
                    Conectado
                  </ZenBadge>
                )}
              </div>
              <ZenCardDescription className="text-sm mt-1.5">{description}</ZenCardDescription>
            </div>
          </div>
        </div>
      </ZenCardHeader>
      <ZenCardContent>
        {children || (
          !isComingSoon && (
            <ZenButton
              variant={isConnected ? 'outline' : 'primary'}
              size="sm"
              onClick={handleAction}
              className="w-full"
              disabled={!onConnect && !onManage}
            >
              {isConnected ? manageLabel : connectLabel}
            </ZenButton>
          )
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

