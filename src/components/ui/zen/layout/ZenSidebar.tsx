"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ZenCard } from "@/components/ui/zen/base/ZenCard";
import { Menu } from "lucide-react";

interface ZenSidebarProps {
  children: React.ReactNode;
  className?: string;
}

interface ZenSidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

interface ZenSidebarTriggerProps {
  className?: string;
}

interface ZenSidebarContentProps {
  children: React.ReactNode;
  className?: string;
}

interface ZenSidebarHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface ZenSidebarFooterProps {
  children: React.ReactNode;
  className?: string;
}

interface ZenSidebarGroupProps {
  children: React.ReactNode;
  className?: string;
}

interface ZenSidebarGroupLabelProps {
  children: React.ReactNode;
  className?: string;
}

interface ZenSidebarGroupContentProps {
  children: React.ReactNode;
  className?: string;
}

interface ZenSidebarMenuProps {
  children: React.ReactNode;
  className?: string;
}

interface ZenSidebarMenuItemProps {
  children: React.ReactNode;
  className?: string;
}

interface ZenSidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  asChild?: boolean;
  isActive?: boolean;
}

interface ZenSidebarMenuSubProps {
  children: React.ReactNode;
  className?: string;
}

interface ZenSidebarMenuSubItemProps {
  children: React.ReactNode;
  className?: string;
}

interface ZenSidebarMenuSubButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  asChild?: boolean;
  isActive?: boolean;
}

// Context para el estado del sidebar
const ZenSidebarContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  isMobile: boolean;
}>({
  isOpen: false,
  setIsOpen: () => { },
  toggleSidebar: () => { },
  isMobile: false,
});

// Provider del sidebar
export function ZenSidebarProvider({ children, defaultOpen = false }: ZenSidebarProviderProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const [isMobile, setIsMobile] = React.useState(false);

  // Detectar si es mobile
  React.useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);

      // En desktop, siempre cerrar el sidebar
      if (!mobile && isOpen) {
        setIsOpen(false);
      }
    };

    // Verificar inmediatamente
    checkIsMobile();

    // Agregar listener
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, [isOpen]);

  const toggleSidebar = React.useCallback(() => {
    console.log('Toggle sidebar clicked, current state:', isOpen);
    setIsOpen(prev => {
      console.log('Setting sidebar to:', !prev);
      return !prev;
    });
  }, [isOpen]);

  return (
    <ZenSidebarContext.Provider value={{ isOpen, setIsOpen, toggleSidebar, isMobile }}>
      {children}
    </ZenSidebarContext.Provider>
  );
}

// Hook para usar el contexto
export function useZenSidebar() {
  const context = React.useContext(ZenSidebarContext);
  if (!context) {
    throw new Error("useZenSidebar must be used within a ZenSidebarProvider");
  }
  return context;
}

// Componente principal del sidebar
export function ZenSidebar({ children, className }: ZenSidebarProps) {
  const { isOpen } = useZenSidebar();

  return (
    <div
      className={cn(
        "fixed left-0 top-0 z-50 h-screen w-72 transform transition-transform duration-300 ease-in-out",
        "max-w-[80vw] sm:w-72",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0 lg:static lg:z-auto lg:max-w-none",
        // Ajustar para header global - sidebar debe usar altura completa disponible
        "lg:h-full",
        className
      )}
    >
      <ZenCard
        variant="default"
        padding="none"
        className="h-full w-full border-r border-zinc-900 bg-zinc-950 rounded-none overflow-hidden"
      >
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </ZenCard>
    </div>
  );
}

// Trigger para abrir/cerrar el sidebar
export function ZenSidebarTrigger({ className }: ZenSidebarTriggerProps) {
  const { toggleSidebar, isOpen } = useZenSidebar();

  const handleClick = () => {
    console.log('Trigger clicked, current state:', isOpen);
    toggleSidebar();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "lg:hidden z-50 relative p-2 rounded-md hover:bg-zinc-800 transition-colors",
        "flex items-center justify-center",
        className
      )}
    >
      <Menu className="h-5 w-5 text-white" />
      <span className="sr-only">Toggle sidebar</span>
    </button>
  );
}

// Contenido del sidebar
export function ZenSidebarContent({ children, className }: ZenSidebarContentProps) {
  return (
    <div className={cn("flex-1 overflow-y-auto", className)}>
      {children}
    </div>
  );
}

// Header del sidebar
export function ZenSidebarHeader({ children, className }: ZenSidebarHeaderProps) {
  return (
    <div className={cn("border-b border-zinc-900 p-3", className)}>
      {children}
    </div>
  );
}

// Footer del sidebar
export function ZenSidebarFooter({ children, className }: ZenSidebarFooterProps) {
  return (
    <div className={cn("border-t border-zinc-900 p-3", className)}>
      {children}
    </div>
  );
}

// Grupo del sidebar
export function ZenSidebarGroup({ children, className }: ZenSidebarGroupProps) {
  return (
    <div className={cn("p-2", className)}>
      {children}
    </div>
  );
}

// Label del grupo
export function ZenSidebarGroupLabel({ children, className }: ZenSidebarGroupLabelProps) {
  return (
    <div className={cn("mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider", className)}>
      {children}
    </div>
  );
}

// Contenido del grupo
export function ZenSidebarGroupContent({ children, className }: ZenSidebarGroupContentProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {children}
    </div>
  );
}

// Menú del sidebar
export function ZenSidebarMenu({ children, className }: ZenSidebarMenuProps) {
  return (
    <nav className={cn("space-y-1", className)}>
      {children}
    </nav>
  );
}

// Item del menú
export function ZenSidebarMenuItem({ children, className }: ZenSidebarMenuItemProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
    </div>
  );
}

// Botón del menú
export function ZenSidebarMenuButton({
  children,
  className,
  asChild = false,
  isActive = false,
  ...props
}: ZenSidebarMenuButtonProps) {
  if (asChild) {
    return (
      <div
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "hover:bg-zinc-800 hover:text-white",
          "focus:bg-zinc-800 focus:text-white focus:outline-none",
          isActive && "bg-zinc-800 text-white",
          !isActive && "text-zinc-400",
          className
        )}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        {children}
      </div>
    );
  }

  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-zinc-800 hover:text-white",
        "focus:bg-zinc-800 focus:text-white focus:outline-none",
        isActive && "bg-zinc-800 text-white",
        !isActive && "text-zinc-400",
        className
      )}
      suppressHydrationWarning
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}

// Submenú del sidebar
export function ZenSidebarMenuSub({ children, className }: ZenSidebarMenuSubProps) {
  return (
    <div className={cn("ml-6 space-y-1 border-l border-zinc-800 pl-2", className)}>
      {children}
    </div>
  );
}

// Item del submenú
export function ZenSidebarMenuSubItem({ children, className }: ZenSidebarMenuSubItemProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
    </div>
  );
}

// Botón del submenú
export function ZenSidebarMenuSubButton({
  children,
  className,
  asChild = false,
  isActive = false,
  ...props
}: ZenSidebarMenuSubButtonProps) {
  if (asChild) {
    return (
      <div
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "hover:bg-zinc-800 hover:text-white",
          "focus:bg-zinc-800 focus:text-white focus:outline-none",
          isActive && "bg-zinc-800 text-white",
          !isActive && "text-zinc-400",
          className
        )}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        {children}
      </div>
    );
  }

  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-zinc-800 hover:text-white",
        "focus:bg-zinc-800 focus:text-white focus:outline-none",
        isActive && "bg-zinc-800 text-white",
        !isActive && "text-zinc-400",
        className
      )}
      suppressHydrationWarning
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}

// Overlay para mobile
export function ZenSidebarOverlay() {
  const { isOpen, setIsOpen, isMobile } = useZenSidebar();

  if (!isOpen || !isMobile) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50"
      onClick={() => setIsOpen(false)}
    />
  );
}
