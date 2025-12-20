'use client';

import React, { useEffect, useState } from 'react';
import { Briefcase } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/shadcn/command';
import {
  Calendar,
  ContactRound,
  ShoppingBag,
  Sparkles,
  BarChart3,
  Home,
  File,
  Users,
  DollarSign,
  FileText,
  UserCog,
  Megaphone,
  Mail,
  ImageIcon,
  HelpCircle,
  Search,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CommandMenuProps {
  studioSlug: string;
  onAgendaClick: () => void;
  onContactsClick: () => void;
  onMagicClick: () => void;
  onPersonalClick: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandMenu({
  studioSlug,
  onAgendaClick,
  onContactsClick,
  onMagicClick,
  onPersonalClick,
  open: controlledOpen,
  onOpenChange,
}: CommandMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const router = useRouter();

  // Detectar si es Mac
  useEffect(() => {
    setIsMac(typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform));
  }, []);

  // Listener para Cmd+K (Mac) / Ctrl+K (Windows/Linux)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleNavigate = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  const navigationItems = [
    {
      category: 'Herramientas Rápidas',
      items: [
        {
          label: 'Agenda',
          icon: Calendar,
          action: () => {
            onAgendaClick();
            setOpen(false);
          },
        },
        {
          label: 'Contactos',
          icon: ContactRound,
          action: () => {
            onContactsClick();
            setOpen(false);
          },
        },
        {
          label: 'ZEN Magic',
          icon: Sparkles,
          action: () => {
            onMagicClick();
            setOpen(false);
          },
        },
      ],
    },
    {
      category: 'Navegación',
      items: [
        {
          label: 'Dashboard',
          icon: Home,
          href: `/${studioSlug}/studio/commercial/dashboard`,
        },
        {
          label: 'Business',
          icon: Briefcase,
          href: `/${studioSlug}/studio/business/events`,
        },
        {
          label: 'Promesas',
          icon: File,
          href: `/${studioSlug}/studio/commercial/promises`,
        },
        {
          label: 'Oferta Comercial',
          icon: Users,
          href: `/${studioSlug}/studio/commercial/catalogo`,
        },
        {
          label: 'Personal',
          icon: Users,
          action: () => {
            onPersonalClick();
            setOpen(false);
          },
        },
        {
          label: 'Contratos',
          icon: FileText,
          href: `/${studioSlug}/studio/contratos`,
        },
        {
          label: 'Finanzas',
          icon: DollarSign,
          href: `/${studioSlug}/studio/business/finanzas`,
        },
        {
          label: 'Ofertas',
          icon: Megaphone,
          href: `/${studioSlug}/studio/commercial/ofertas`,
        },
        {
          label: 'Analytics',
          icon: BarChart3,
          href: `/${studioSlug}/studio/commercial/dashboard`,
        },
      ],
    },
    {
      category: 'Ayuda',
      items: [
        {
          label: 'Documentación',
          icon: HelpCircle,
          href: '#help-docs',
        },
        {
          label: 'Atajos de Teclado',
          icon: Search,
          href: '#help-shortcuts',
        },
      ],
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar herramientas, páginas..." />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
        {navigationItems.map((group, idx) => (
          <React.Fragment key={group.category}>
            <CommandGroup heading={group.category}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.label}
                  onSelect={() => {
                    if (item.href) {
                      handleNavigate(item.href);
                    } else if ('action' in item) {
                      item.action();
                    }
                  }}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {idx < navigationItems.length - 1 && <CommandSeparator />}
          </React.Fragment>
        ))}
      </CommandList>
      <div className="border-t px-2 py-2 text-xs text-zinc-500">
        Presiona <kbd className="rounded bg-zinc-800 px-1">{isMac ? '⌘' : 'Ctrl'}+K</kbd> para abrir
      </div>
    </CommandDialog>
  );
}

