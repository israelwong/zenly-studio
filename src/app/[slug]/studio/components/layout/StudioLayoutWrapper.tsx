'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { StudioSidebar } from '../sidebar/StudioSidebar';
import { AppHeader } from '../header/AppHeader';
import { ZenMagicChatWrapper } from '../ZenMagic';
import { CommandMenu } from '../tools/CommandMenu';
import { useZenMagicChat } from '../ZenMagic';
import { useContactsSheet } from '@/components/shared/contacts/ContactsSheetContext';
import { AgendaUnifiedSheet } from '@/components/shared/agenda';
import { ContactsSheet } from '@/components/shared/contacts';
import { CrewMembersManager } from '@/components/shared/crew-members';
import { TareasOperativasSheet } from '@/components/shared/tareas-operativas/TareasOperativasSheet';
import { RemindersSideSheet } from '@/components/shared/reminders/RemindersSideSheet';
import { PromisesConfigProvider, usePromisesConfig } from '../../commercial/promises/context/PromisesConfigContext';
import { ConfigurationCatalogModal, type ConfigurationSection } from '@/components/shared/configuracion';
import { FileText, Shield, Receipt, CreditCard, FileCheck, Building2, Package } from 'lucide-react';
import { CondicionesComercialesManager } from '@/components/shared/condiciones-comerciales';
import { TerminosCondicionesEditor } from '@/components/shared/terminos-condiciones';
import { AvisoPrivacidadManager } from '@/components/shared/avisos-privacidad/AvisoPrivacidadManager';
import { PaymentMethodsModal } from '@/components/shared/payments/PaymentMethodsModal';
import { ContractTemplateManagerModal } from '@/components/shared/contracts/ContractTemplateManagerModal';
import { StudioContractDataModal } from '@/components/shared/contracts/StudioContractDataModal';
import { TipoEventoManagementModal } from '@/components/shared/tipos-evento/TipoEventoManagementModal';

interface StudioLayoutWrapperProps {
  studioSlug: string;
  children: React.ReactNode;
}

function StudioLayoutContent({
  studioSlug,
  children,
}: StudioLayoutWrapperProps) {
  const pathname = usePathname();
  const { toggleChat } = useZenMagicChat();
  const { isOpen: contactsOpen, openContactsSheet, closeContactsSheet, initialContactId } = useContactsSheet();
  const promisesConfig = usePromisesConfig();
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [crewSheetOpen, setCrewSheetOpen] = useState(false);
  const [tareasOperativasOpen, setTareasOperativasOpen] = useState(false);
  const [remindersSheetOpen, setRemindersSheetOpen] = useState(false);
  
  // Estados para modales de configuración
  const [showCondicionesManager, setShowCondicionesManager] = useState(false);
  const [showTerminosManager, setShowTerminosManager] = useState(false);
  const [showAvisoPrivacidad, setShowAvisoPrivacidad] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showContractsModal, setShowContractsModal] = useState(false);
  const [showStudioDataModal, setShowStudioDataModal] = useState(false);
  const [showEventTypesModal, setShowEventTypesModal] = useState(false);

  // Escuchar eventos del catálogo de configuración
  useEffect(() => {
    const handleOpenTerminos = () => setShowTerminosManager(true);
    const handleOpenAviso = () => setShowAvisoPrivacidad(true);
    const handleOpenCondiciones = () => setShowCondicionesManager(true);
    const handleOpenPaymentMethods = () => setShowPaymentMethods(true);
    const handleOpenContracts = () => setShowContractsModal(true);
    const handleOpenStudioData = () => setShowStudioDataModal(true);
    const handleOpenEventTypes = () => setShowEventTypesModal(true);

    window.addEventListener('open-terminos-modal', handleOpenTerminos);
    window.addEventListener('open-aviso-modal', handleOpenAviso);
    window.addEventListener('open-condiciones-modal', handleOpenCondiciones);
    window.addEventListener('open-payment-methods-modal', handleOpenPaymentMethods);
    window.addEventListener('open-contracts-modal', handleOpenContracts);
    window.addEventListener('open-studio-data-modal', handleOpenStudioData);
    window.addEventListener('open-event-types-modal', handleOpenEventTypes);

    return () => {
      window.removeEventListener('open-terminos-modal', handleOpenTerminos);
      window.removeEventListener('open-aviso-modal', handleOpenAviso);
      window.removeEventListener('open-condiciones-modal', handleOpenCondiciones);
      window.removeEventListener('open-payment-methods-modal', handleOpenPaymentMethods);
      window.removeEventListener('open-contracts-modal', handleOpenContracts);
      window.removeEventListener('open-studio-data-modal', handleOpenStudioData);
      window.removeEventListener('open-event-types-modal', handleOpenEventTypes);
    };
  }, []);

  const handlePromisesConfigClick = () => {
    if (promisesConfig?.openConfigCatalog) {
      promisesConfig.openConfigCatalog();
    } else {
      console.warn('PromisesConfig context not available');
    }
  };

  const handleAgendaClick = () => {
    setAgendaOpen(true);
  };

  const handleContactsClick = () => {
    openContactsSheet();
  };

  const handleMagicClick = () => {
    toggleChat();
  };

  const handlePersonalClick = () => {
    setCrewSheetOpen(true);
  };

  const handleTareasOperativasClick = () => {
    setTareasOperativasOpen(true);
  };

  const handleRemindersClick = () => {
    setRemindersSheetOpen(true);
  };

  // Función para cerrar todos los overlays
  const closeAllOverlays = useCallback(() => {
    setRemindersSheetOpen(false);
    setAgendaOpen(false);
    setCrewSheetOpen(false);
    setTareasOperativasOpen(false);
    closeContactsSheet(); // Cierra ContactsSheet (usa contexto, no estado local)
  }, [closeContactsSheet]);

  // Escuchar evento para cerrar overlays al navegar
  useEffect(() => {
    const handleCloseOverlays = () => {
      closeAllOverlays();
    };

    window.addEventListener('close-overlays', handleCloseOverlays);
    return () => {
      window.removeEventListener('close-overlays', handleCloseOverlays);
    };
  }, [closeAllOverlays]);

  // Seguro adicional: Cerrar overlays cuando cambia la ruta
  // Si por alguna razón el evento 'close-overlays' no se dispara,
  // el cambio de pathname lo detectará automáticamente
  // Usamos useRef para evitar cerrar en el montaje inicial
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    // Solo cerrar si la ruta realmente cambió (no en el montaje inicial)
    if (prevPathnameRef.current !== pathname) {
      closeAllOverlays();
      prevPathnameRef.current = pathname;
    }
  }, [pathname, closeAllOverlays]);

  // Configuraciones disponibles para el catálogo
  const configurationSections: ConfigurationSection[] = [
    {
      id: 'comercial',
      title: 'Configuración Comercial',
      items: [
        {
          id: 'condiciones',
          title: 'Condiciones Comerciales',
          description: 'Gestiona las condiciones comerciales y métodos de pago disponibles',
          icon: Receipt,
          onClick: () => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-condiciones-modal'));
            }, 100);
          },
          category: 'comercial',
        },
        {
          id: 'pagos',
          title: 'Métodos de Pago',
          description: 'Configura los métodos de pago aceptados y transferencias',
          icon: CreditCard,
          onClick: () => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-payment-methods-modal'));
            }, 100);
          },
          category: 'comercial',
        },
        {
          id: 'contratos',
          title: 'Plantilla de Contratos',
          description: 'Gestiona las plantillas de contratos reutilizables para tus eventos',
          icon: FileCheck,
          onClick: () => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-contracts-modal'));
            }, 100);
          },
          category: 'comercial',
        },
        {
          id: 'tipos-evento',
          title: 'Tipos de Evento',
          description: 'Gestiona los tipos de eventos disponibles para tus promesas',
          icon: Package,
          onClick: () => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-event-types-modal'));
            }, 100);
          },
          category: 'comercial',
        },
      ],
    },
    {
      id: 'legal',
      title: 'Documentos Legales',
      items: [
        {
          id: 'terminos',
          title: 'Términos y Condiciones',
          description: 'Gestiona los términos y condiciones que aceptan tus clientes',
          icon: FileText,
          onClick: () => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-terminos-modal'));
            }, 100);
          },
          category: 'legal',
        },
        {
          id: 'aviso',
          title: 'Aviso de Privacidad',
          description: 'Configura el aviso de privacidad para el cumplimiento legal',
          icon: Shield,
          onClick: () => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-aviso-modal'));
            }, 100);
          },
          category: 'legal',
        },
        {
          id: 'datos-legales',
          title: 'Datos Legales del Estudio',
          description: 'Edita la información legal del estudio para contratos y documentos',
          icon: Building2,
          onClick: () => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-studio-data-modal'));
            }, 100);
          },
          category: 'legal',
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* COLUMNA 1: Main Column (AppHeader + Sidebar + Content en flex-col) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* AppHeader - Full width */}
        <AppHeader
          studioSlug={studioSlug}
          onCommandOpen={() => setCommandOpen(true)}
          onAgendaClick={handleAgendaClick}
          onTareasOperativasClick={handleTareasOperativasClick}
          onContactsClick={handleContactsClick}
          onRemindersClick={handleRemindersClick}
          onPromisesConfigClick={handlePromisesConfigClick}
        />

        {/* Container: Sidebar + Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Izquierdo (Navegación) */}
          <StudioSidebar studioSlug={studioSlug} onCommandOpen={() => setCommandOpen(true)} />

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-zinc-900/40">
            <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>

        <CommandMenu
          studioSlug={studioSlug}
          onAgendaClick={handleAgendaClick}
          onContactsClick={handleContactsClick}
          onMagicClick={handleMagicClick}
          onPersonalClick={handlePersonalClick}
          open={commandOpen}
          onOpenChange={setCommandOpen}
        />
      </div>

      {/* ZEN Magic Chat (siempre al final) */}
      <ZenMagicChatWrapper studioSlug={studioSlug} />

      {/* Sheet de Agenda */}
      <AgendaUnifiedSheet
        open={agendaOpen}
        onOpenChange={setAgendaOpen}
        studioSlug={studioSlug}
      />

      {/* Sheet de Contactos */}
      <ContactsSheet
        open={contactsOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeContactsSheet();
          }
        }}
        studioSlug={studioSlug}
        initialContactId={initialContactId}
      />

      {/* Sheet de Personal */}
      <CrewMembersManager
        studioSlug={studioSlug}
        isOpen={crewSheetOpen}
        onClose={() => setCrewSheetOpen(false)}
        mode="manage"
      />

      {/* Sheet de Tareas Operativas */}
      <TareasOperativasSheet
        open={tareasOperativasOpen}
        onOpenChange={setTareasOperativasOpen}
        studioSlug={studioSlug}
      />

      {/* Sheet de Seguimientos */}
      <RemindersSideSheet
        open={remindersSheetOpen}
        onOpenChange={setRemindersSheetOpen}
        studioSlug={studioSlug}
      />

      {/* Catálogo de Configuración */}
      {promisesConfig && (
        <ConfigurationCatalogModal
          isOpen={promisesConfig.isConfigCatalogOpen}
          onClose={promisesConfig.closeConfigCatalog}
          sections={configurationSections}
          title="Opciones de Configuración"
          description="Gestiona las configuraciones generales de tu estudio"
        />
      )}

      {/* Modales de Configuración (universales) */}
      <CondicionesComercialesManager
        studioSlug={studioSlug}
        isOpen={showCondicionesManager}
        onClose={() => setShowCondicionesManager(false)}
      />

      <TerminosCondicionesEditor
        studioSlug={studioSlug}
        isOpen={showTerminosManager}
        onClose={() => setShowTerminosManager(false)}
      />

      <AvisoPrivacidadManager
        studioSlug={studioSlug}
        isOpen={showAvisoPrivacidad}
        onClose={() => setShowAvisoPrivacidad(false)}
      />

      <PaymentMethodsModal
        isOpen={showPaymentMethods}
        onClose={() => setShowPaymentMethods(false)}
        studioSlug={studioSlug}
      />

      <ContractTemplateManagerModal
        isOpen={showContractsModal}
        onClose={() => setShowContractsModal(false)}
        studioSlug={studioSlug}
      />

      <StudioContractDataModal
        isOpen={showStudioDataModal}
        onClose={() => setShowStudioDataModal(false)}
        studioSlug={studioSlug}
        onSave={async () => {
          // Recargar datos si es necesario
        }}
      />

      <TipoEventoManagementModal
        isOpen={showEventTypesModal}
        onClose={() => setShowEventTypesModal(false)}
        studioSlug={studioSlug}
      />
    </div>
  );
}

export function StudioLayoutWrapper({
  studioSlug,
  children,
}: StudioLayoutWrapperProps) {
  return (
    <PromisesConfigProvider>
      <StudioLayoutContent studioSlug={studioSlug}>
        {children}
      </StudioLayoutContent>
    </PromisesConfigProvider>
  );
}
