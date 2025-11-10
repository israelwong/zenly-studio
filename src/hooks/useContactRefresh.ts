import { useState, useEffect, useCallback } from 'react';

// Evento personalizado para notificar cambios de contactos
const CONTACT_UPDATE_EVENT = 'contact-update';

interface ContactUpdateEventDetail {
  contactId: string;
  contact?: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    [key: string]: any;
  };
}

/**
 * Hook para disparar actualizaciones de contactos
 * Permite notificar a otros componentes cuando se actualiza un contacto
 */
export function useContactRefresh() {
  // Función para disparar actualización de contacto
  const triggerContactUpdate = useCallback((contactId: string, contact?: ContactUpdateEventDetail['contact']) => {
    window.dispatchEvent(new CustomEvent(CONTACT_UPDATE_EVENT, {
      detail: { contactId, contact }
    }));
  }, []);

  return {
    triggerContactUpdate,
  };
}

/**
 * Hook para escuchar actualizaciones de contactos
 * Los componentes pueden suscribirse a cambios de un contacto específico
 */
export function useContactUpdateListener(
  contactId: string | null | undefined,
  onUpdate: (contact: ContactUpdateEventDetail['contact']) => void
) {
  useEffect(() => {
    if (!contactId) return;

    const handleContactUpdate = (event: CustomEvent<ContactUpdateEventDetail>) => {
      if (event.detail?.contactId === contactId) {
        onUpdate(event.detail.contact);
      }
    };

    window.addEventListener(CONTACT_UPDATE_EVENT, handleContactUpdate as EventListener);

    return () => {
      window.removeEventListener(CONTACT_UPDATE_EVENT, handleContactUpdate as EventListener);
    };
  }, [contactId, onUpdate]);
}

