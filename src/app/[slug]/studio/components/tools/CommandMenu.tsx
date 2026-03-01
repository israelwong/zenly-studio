'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Megaphone,
  HelpCircle,
  Search,
  Settings,
  Percent,
  CreditCard,
  FileCheck,
  Package,
  FolderOpen,
  CalendarDays,
  Receipt,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  getCommandRegistry,
  COMMAND_CATEGORY_ORDER,
  type CommandEntry,
  type CommandCategory,
} from '@/lib/config/command-registry';

interface CommandMenuProps {
  studioSlug: string;
  onAgendaClick: () => void;
  onContactsClick: () => void;
  onMagicClick: () => void;
  onPersonalClick: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'capacidad-operativa': CalendarDays,
  'rentabilidad': Percent,
  'condiciones': Receipt,
  'pagos': CreditCard,
  'contratos': FileCheck,
  'tipos-evento': Package,
  'agenda': Calendar,
  'contactos': ContactRound,
  'zen-magic': Sparkles,
  'personal': Users,
  'dashboard': Home,
  'business': File,
  'promesas': File,
  'catalogo': ShoppingBag,
  'paquetes': Package,
  'portafolios': FolderOpen,
  'contratos-nav': FileText,
  'finanzas': DollarSign,
  'ofertas': Megaphone,
  'analytics': BarChart3,
  'documentacion': HelpCircle,
  'atajos': Search,
};
const DEFAULT_ICON = Settings;

function getIcon(entry: CommandEntry) {
  return ICON_MAP[entry.id] ?? DEFAULT_ICON;
}

/** Texto buscable: label + description + keywords para que cmdk filtre */
function getSearchValue(entry: CommandEntry): string {
  return [entry.label, entry.description, ...entry.keywords].filter(Boolean).join(' ').toLowerCase();
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
  const executedRef = useRef(false);

  const registry = useMemo(() => getCommandRegistry(studioSlug), [studioSlug]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<CommandCategory, CommandEntry[]>();
    for (const cat of COMMAND_CATEGORY_ORDER) {
      map.set(cat, []);
    }
    for (const entry of registry) {
      const list = map.get(entry.category);
      if (list) list.push(entry);
    }
    return COMMAND_CATEGORY_ORDER.map((cat) => ({ category: cat, items: map.get(cat) ?? [] })).filter(
      (g) => g.items.length > 0
    );
  }, [registry]);

  useEffect(() => {
    setIsMac(typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform));
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setOpen]);

  const executeAction = (entry: CommandEntry) => {
    if (executedRef.current) return;
    executedRef.current = true;
    setTimeout(() => {
      executedRef.current = false;
    }, 300);

    switch (entry.actionType) {
      case 'modal':
        window.dispatchEvent(new CustomEvent(entry.action));
        break;
      case 'route':
        router.push(entry.action);
        break;
      case 'callback':
        switch (entry.action) {
          case 'agenda':
            onAgendaClick();
            break;
          case 'contacts':
            onContactsClick();
            break;
          case 'magic':
            onMagicClick();
            break;
          case 'personal':
            onPersonalClick();
            break;
          default:
            break;
        }
        break;
    }
    requestAnimationFrame(() => setOpen(false));
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar herramientas, páginas, cupo, capacidad..." />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
        {groupedByCategory.map((group, idx) => (
          <React.Fragment key={group.category}>
            <CommandGroup heading={group.category}>
              {group.items.map((entry) => {
                const Icon = getIcon(entry);
                return (
                  <CommandItem
                    key={entry.id}
                    value={getSearchValue(entry)}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      executeAction(entry);
                    }}
                    onSelect={() => executeAction(entry)}
                    className="cursor-pointer pointer-events-auto rounded-md transition-colors duration-150 hover:bg-zinc-800/80 aria-selected:bg-zinc-800/90 active:bg-zinc-700/80"
                  >
                    <Icon className="mr-2 h-4 w-4 shrink-0" />
                    <span>{entry.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {idx < groupedByCategory.length - 1 && <CommandSeparator />}
          </React.Fragment>
        ))}
      </CommandList>
      <div className="border-t px-2 py-2 text-xs text-zinc-500">
        Presiona <kbd className="rounded bg-zinc-800 px-1">{isMac ? '⌘' : 'Ctrl'}+K</kbd> para abrir
      </div>
    </CommandDialog>
  );
}
