'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { StudioSidebar } from '../sidebar/StudioSidebar';
import { AppHeader } from '../header/AppHeader';
import { HeaderDataLoader } from './HeaderDataLoader';
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
import { FileText, Shield, Receipt, CreditCard, FileCheck, Building2, Package, Zap } from 'lucide-react';
import { PromiseShareOptionsModal } from '@/app/[slug]/studio/commercial/promises/[promiseId]/components/PromiseShareOptionsModal';
import { CondicionesComercialesManager } from '@/components/shared/condiciones-comerciales';
import { TerminosCondicionesEditor } from '@/components/shared/terminos-condiciones';
import { AvisoPrivacidadManager } from '@/components/shared/avisos-privacidad/AvisoPrivacidadManager';
import { PaymentMethodsModal } from '@/components/shared/payments/PaymentMethodsModal';
import { ContractTemplateManagerModal } from '@/components/shared/contracts/ContractTemplateManagerModal';
import { StudioContractDataModal } from '@/components/shared/contracts/StudioContractDataModal';
import { TipoEventoManagementModal } from '@/components/shared/tipos-evento/TipoEventoManagementModal';

import type { IdentidadData } from '@/app/[slug]/studio/business/identity/types';
import type { StorageStats } from '@/lib/actions/shared/calculate-storage.actions';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import type { ReminderWithPromise } from '@/lib/actions/studio/commercial/promises/reminders.actions';

/** Perfil de usuario para el header (nombre + avatar). Origen: users + studio_user_profiles (obtenerPerfil). */
export interface InitialUserProfile {
  name: string;
  avatarUrl: string | null;
}

interface StudioLayoutWrapperProps {
  studioSlug: string;
  children: React.ReactNode;
  initialIdentidadData?: IdentidadData | null; // ✅ OPTIMIZACIÓN: Datos pre-cargados del servidor
  initialUserProfile?: InitialUserProfile | null; // ✅ Perfil usuario para header (obtenerPerfil)
  initialStorageData?: StorageStats | null; // ✅ OPTIMIZACIÓN: Storage pre-calculado del servidor
  initialAgendaCount?: number; // ✅ PASO 4: Pre-cargado en servidor (eliminar POST del cliente)
  initialRemindersCount?: number; // ✅ PASO 4: Pre-cargado en servidor (eliminar POSTs del cliente)
  initialHeaderUserId?: string | null; // ✅ PASO 4: Pre-cargado en servidor (para useStudioNotifications)
  initialAgendaEvents?: AgendaItem[]; // ✅ 6 eventos más próximos para AgendaPopover
  initialRemindersAlerts?: ReminderWithPromise[]; // ✅ Recordatorios de hoy + próximos (sin vencidos) para AlertsPopover
}

function StudioLayoutContent({
  studioSlug,
  children,
  initialIdentidadData,
  initialUserProfile,
  initialStorageData,
  initialAgendaCount = 0, // ✅ PASO 4: Pre-cargado en servidor
  initialRemindersCount = 0, // ✅ PASO 4: Pre-cargado en servidor
  initialHeaderUserId = null, // ✅ PASO 4: Pre-cargado en servidor (para useStudioNotifications)
  initialAgendaEvents = [], // ✅ 6 eventos más próximos
  initialRemindersAlerts = [], // ✅ Recordatorios vencidos + hoy
}: StudioLayoutWrapperProps) {
  const pathname = usePathname();
  
  // ✅ OPTIMIZACIÓN: Estado para datos cargados en el cliente
  const [headerData, setHeaderData] = useState({
    headerUserId: initialHeaderUserId,
    agendaCount: initialAgendaCount,
    remindersCount: initialRemindersCount,
    agendaEvents: initialAgendaEvents,
    remindersAlerts: initialRemindersAlerts,
    reminders: [] as ReminderWithPromise[],
  });
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
  const [paymentMethodsModalOptions, setPaymentMethodsModalOptions] = useState<{ openTransferConfigDirectly?: boolean }>({});
  const [showContractsModal, setShowContractsModal] = useState(false);
  const [showStudioDataModal, setShowStudioDataModal] = useState(false);
  const [showEventTypesModal, setShowEventTypesModal] = useState(false);
  const [showAutomationModal, setShowAutomationModal] = useState(false);

  // Escuchar eventos del catálogo de configuración
  useEffect(() => {
    const handleOpenTerminos = () => setShowTerminosManager(true);
    const handleOpenAviso = () => setShowAvisoPrivacidad(true);
    const handleOpenCondiciones = () => setShowCondicionesManager(true);
    const handleOpenPaymentMethods = (e?: Event) => {
      const detail = (e as CustomEvent<{ openTransferConfigDirectly?: boolean }> | undefined)?.detail;
      setPaymentMethodsModalOptions(detail ?? {});
      setShowPaymentMethods(true);
    };
    const handleOpenContracts = () => setShowContractsModal(true);
    const handleOpenStudioData = () => setShowStudioDataModal(true);
    const handleOpenEventTypes = () => setShowEventTypesModal(true);

    window.addEventListener('open-terminos-modal', handleOpenTerminos);
    window.addEventListener('open-aviso-modal', handleOpenAviso);
    window.addEventListener('open-condiciones-modal', handleOpenCondiciones);
    window.addEventListener('open-payment-methods-modal', handleOpenPaymentMethods as EventListener);
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

  // Configuraciones disponibles para el catálogo (keywords para búsqueda)
  const configurationSections: ConfigurationSection[] = [
    {
      id: 'comercial',
      title: 'Configuración Comercial',
      items: [
        {
          id: 'automatizacion',
          title: 'Opciones de Automatización',
          description: 'Configura la capacidad diaria del estudio, gestión de conflictos de fecha, envío automático de WhatsApp y recordatorios inteligentes.',
          icon: Zap,
          onClick: () => {
            promisesConfig?.closeConfigCatalog?.();
            setTimeout(() => setShowAutomationModal(true), 150);
          },
          category: 'comercial',
          isFullWidth: true,
          tags: ['Capacidad', 'Conflictos de fecha', 'WhatsApp', 'Notificaciones', 'Recordatorios', 'Disponibilidad', 'Agenda', 'Flujos'],
          keywords: ['capacidad', 'conflictos de fecha', 'whatsapp', 'notificaciones', 'mensajes automáticos', 'recordatorios', 'reglas de negocio', 'disponibilidad', 'agenda', 'flujos', 'automatización', 'automatizacion', 'promesas', 'prospecto', 'cotización', 'cupos', 'contrato', 'correo', 'etapas'],
        },
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
          keywords: ['condiciones', 'pago', 'utilidad', 'descuento'],
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
          keywords: ['pagos', 'transferencia', 'clabe', 'tarjeta', 'efectivo'],
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
          keywords: ['contratos', 'plantilla', 'documentos'],
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
          keywords: ['tipos', 'evento', 'boda', 'quinceañera', 'paquetes'],
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
          keywords: ['términos', 'terminos', 'condiciones', 'legal'],
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
          keywords: ['aviso', 'privacidad', 'datos', 'legal'],
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
          keywords: ['estudio', 'rfc', 'razón social', 'legal', 'domicilio'],
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* COLUMNA 1: Main Column (AppHeader + Sidebar + Content en flex-col) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ✅ RESTAURADO: AppHeader con datos pre-cargados (modo optimizado) */}
        <AppHeader
          studioSlug={studioSlug}
          initialIdentidadData={initialIdentidadData} // ✅ OPTIMIZACIÓN: Pasar datos pre-cargados
          initialUserProfile={initialUserProfile} // ✅ Perfil usuario (nombre + avatar) desde obtenerPerfil
          initialStorageData={initialStorageData} // ✅ OPTIMIZACIÓN: Pasar storage pre-calculado
          initialAgendaCount={headerData.agendaCount} // ✅ Cargado en cliente después del primer render
          initialRemindersCount={headerData.remindersCount} // ✅ Cargado en cliente después del primer render
          initialHeaderUserId={headerData.headerUserId} // ✅ Cargado en cliente después del primer render
          initialAgendaEvents={headerData.agendaEvents} // ✅ Cargado en cliente después del primer render
          initialRemindersAlerts={headerData.remindersAlerts} // ✅ Cargado en cliente después del primer render
          initialReminders={headerData.reminders} // ✅ Recordatorios de hoy + próximos
          onCommandOpen={() => setCommandOpen(true)}
          onAgendaClick={handleAgendaClick}
          onTareasOperativasClick={handleTareasOperativasClick}
          onContactsClick={handleContactsClick}
          onRemindersClick={handleRemindersClick}
          onPromisesConfigClick={handlePromisesConfigClick}
        />
        
        {/* ✅ OPTIMIZACIÓN: Cargar datos no críticos después del primer render */}
        <HeaderDataLoader 
          studioSlug={studioSlug} 
          onDataLoaded={setHeaderData}
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
        onClose={() => { setShowPaymentMethods(false); setPaymentMethodsModalOptions({}); }}
        studioSlug={studioSlug}
        openTransferConfigDirectly={paymentMethodsModalOptions.openTransferConfigDirectly}
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

      <PromiseShareOptionsModal
        isOpen={showAutomationModal}
        onClose={() => setShowAutomationModal(false)}
        studioSlug={studioSlug}
        scope="global"
      />
    </div>
  );
}

export function StudioLayoutWrapper({
  studioSlug,
  children,
  initialIdentidadData,
  initialUserProfile,
  initialStorageData,
  initialAgendaCount, // ✅ PASO 4: Pre-cargado en servidor
  initialRemindersCount, // ✅ PASO 4: Pre-cargado en servidor
  initialHeaderUserId, // ✅ PASO 4: Pre-cargado en servidor (para useStudioNotifications)
  initialAgendaEvents, // ✅ 6 eventos más próximos
  initialRemindersAlerts, // ✅ Recordatorios vencidos + hoy
}: StudioLayoutWrapperProps) {
  return (
    <PromisesConfigProvider>
      <StudioLayoutContent 
        studioSlug={studioSlug}
        initialIdentidadData={initialIdentidadData}
        initialUserProfile={initialUserProfile}
        initialStorageData={initialStorageData}
        initialAgendaCount={initialAgendaCount} // ✅ PASO 4: Pre-cargado en servidor
        initialRemindersCount={initialRemindersCount} // ✅ PASO 4: Pre-cargado en servidor
        initialHeaderUserId={initialHeaderUserId} // ✅ PASO 4: Pre-cargado en servidor (para useStudioNotifications)
        initialAgendaEvents={initialAgendaEvents} // ✅ 6 eventos más próximos
        initialRemindersAlerts={initialRemindersAlerts} // ✅ Recordatorios vencidos + hoy
      >
        {children}
      </StudioLayoutContent>
    </PromisesConfigProvider>
  );
}
