'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ContactsSheetContextValue {
  openContactsSheet: (contactId?: string | null) => void;
  closeContactsSheet: () => void;
  isOpen: boolean;
  initialContactId: string | null;
}

const ContactsSheetContext = createContext<ContactsSheetContextValue | undefined>(undefined);

export function ContactsSheetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialContactId, setInitialContactId] = useState<string | null>(null);

  const openContactsSheet = useCallback((contactId?: string | null) => {
    setInitialContactId(contactId || null);
    setIsOpen(true);
  }, []);

  const closeContactsSheet = useCallback(() => {
    setIsOpen(false);
    setInitialContactId(null);
  }, []);

  return (
    <ContactsSheetContext.Provider
      value={{
        openContactsSheet,
        closeContactsSheet,
        isOpen,
        initialContactId,
      }}
    >
      {children}
    </ContactsSheetContext.Provider>
  );
}

export function useContactsSheet() {
  const context = useContext(ContactsSheetContext);
  if (context === undefined) {
    throw new Error('useContactsSheet must be used within ContactsSheetProvider');
  }
  return context;
}

