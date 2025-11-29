'use client';

import React from 'react';
import { Calendar, ContactRound, ShoppingBag, Sparkles, BarChart3, Users } from 'lucide-react';
import Link from 'next/link';
import { ZenButton } from '@/components/ui/zen';

interface DockItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  action?: () => void;
}

interface UtilityDockProps {
  studioSlug: string;
  onAgendaClick: () => void;
  onContactsClick: () => void;
  onMagicClick: () => void;
}

export function UtilityDock({
  studioSlug,
  onAgendaClick,
  onContactsClick,
  onMagicClick,
}: UtilityDockProps) {
  const dockItems: DockItem[] = [
    {
      id: 'agenda',
      icon: Calendar,
      label: 'Agenda',
      action: onAgendaClick,
    },
    {
      id: 'contacts',
      icon: ContactRound,
      label: 'Contactos',
      action: onContactsClick,
    },
    {
      id: 'catalog',
      icon: ShoppingBag,
      label: 'Catálogo',
      href: `/${studioSlug}/studio/commercial/catalogo`,
    },
    {
      id: 'personal',
      icon: Users,
      label: 'Personal',
      href: `/${studioSlug}/studio/business/personal`,
    },
    {
      id: 'magic',
      icon: Sparkles,
      label: 'ZEN Magic',
      action: onMagicClick,
    },
    {
      id: 'analytics',
      icon: BarChart3,
      label: 'Analytics',
      href: `/${studioSlug}/studio/dashboard/finanzas`,
    },
  ];

  const renderItem = (item: DockItem) => {
    const buttonContent = (
      <ZenButton
        variant="ghost"
        size="icon"
        className="rounded-full h-10 w-10 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
        onClick={item.action}
        title={item.label}
      >
        <item.icon className="h-5 w-5" />
        <span className="sr-only">{item.label}</span>
      </ZenButton>
    );

    if (item.href) {
      return (
        <Link key={item.id} href={item.href}>
          {buttonContent}
        </Link>
      );
    }

    return (
      <div key={item.id}>
        {buttonContent}
      </div>
    );
  };

  return (
    <aside className="w-12 flex-shrink-0 border-l border-zinc-800 bg-zinc-950/50 flex flex-col items-center py-4 gap-2 z-20">
      {dockItems.map(renderItem)}
    </aside>
  );
}

