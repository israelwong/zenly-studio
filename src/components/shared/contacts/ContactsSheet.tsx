'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ContactRound, Plus, Search, Users, ExternalLink, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import { ZenButton, ZenInput, ZenSelect, ZenBadge } from '@/components/ui/zen';
import { ContactsCardView } from './ContactsCardView';
import { ContactModal } from './ContactModal';
import { ZenConfirmModal } from '@/components/ui/zen';
import { getContacts, deleteContact } from '@/lib/actions/studio/commercial/contacts';
import type { Contact } from '@/lib/actions/schemas/contacts-schemas';
import { toast } from 'sonner';
import { useContactRefresh, useContactUpdateListener } from '@/hooks/useContactRefresh';
import { useContactsRealtime } from '@/hooks/useContactsRealtime';
import { obtenerEstadoConexion } from '@/lib/actions/studio/integrations';
import { iniciarConexionGoogleContacts } from '@/lib/integrations/google';
import { GoogleContactsConnectionModal } from '@/components/shared/integrations/GoogleContactsConnectionModal';

interface ContactsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
  initialContactId?: string | null;
}

export function ContactsSheet({
  open,
  onOpenChange,
  studioSlug,
  initialContactId,
}: ContactsSheetProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'prospecto' | 'cliente'>('all');
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isModalOpenRef = useRef(false);
  const isDeleteModalOpenRef = useRef(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isGoogleContactsConnected, setIsGoogleContactsConnected] = useState(false);
  const [googleContactsEmail, setGoogleContactsEmail] = useState<string | null>(null);
  const [showGoogleContactsModal, setShowGoogleContactsModal] = useState(false);
  const { triggerContactUpdate } = useContactRefresh();

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      setPage(1);
      const result = await getContacts(studioSlug, {
        page: 1,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
      });

      if (result.success && result.data) {
        setContacts(result.data.contacts);
        setTotalPages(result.data.totalPages);
        setTotal(result.data.total);
      } else {
        toast.error(result.error || 'Error al cargar contactos');
      }
    } catch (error) {
      console.error('Error al cargar contactos:', error);
      toast.error('Error al cargar contactos');
    } finally {
      setLoading(false);
    }
  }, [studioSlug, search, statusFilter]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || page >= totalPages) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const result = await getContacts(studioSlug, {
        page: nextPage,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
      });

      if (result.success && result.data) {
        setContacts((prev) => [...prev, ...result.data.contacts]);
        setTotalPages(result.data.totalPages);
        setTotal(result.data.total);
        setPage(nextPage);
      }
    } catch (error) {
      console.error('Error al cargar más contactos:', error);
      toast.error('Error al cargar más contactos');
    } finally {
      setLoadingMore(false);
    }
  }, [studioSlug, page, totalPages, search, statusFilter, loading, loadingMore]);

  useEffect(() => {
    if (open) {
      loadInitial();
      verificarEstadoGoogleContacts();
    } else {
      setIsModalOpen(false);
      setEditingContactId(null);
      isDeleteModalOpenRef.current = false;
      setIsDeleteModalOpen(false);
      setDeletingContactId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Verificar estado de Google Contacts
  const verificarEstadoGoogleContacts = async () => {
    try {
      const status = await obtenerEstadoConexion(studioSlug);
      const hasContactsScope = status.scopes?.some((scope) => scope.includes('contacts')) || false;
      setIsGoogleContactsConnected(hasContactsScope && !!status.email);
      setGoogleContactsEmail(status.email || null);
    } catch (error) {
      console.error('Error verificando estado de Google Contacts:', error);
      setIsGoogleContactsConnected(false);
      setGoogleContactsEmail(null);
    }
  };

  // Manejar conexión de Google Contacts
  const handleConnectGoogleContacts = async () => {
    setShowGoogleContactsModal(true);
  };

  const handleConfirmConnectGoogleContacts = async () => {
    try {
      const result = await iniciarConexionGoogleContacts(studioSlug);
      if (!result.success) {
        toast.error(result.error || 'Error al iniciar conexión con Google Contacts');
        setShowGoogleContactsModal(false);
        return;
      }
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Error conectando Google Contacts:', error);
      toast.error('Error al conectar con Google Contacts');
      setShowGoogleContactsModal(false);
    }
  };

  // Recargar desde el inicio cuando cambian filtros o búsqueda
  useEffect(() => {
    if (open) {
      loadInitial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  // Scroll infinito: cargar más cuando el sentinel es visible
  const hasMore = page < totalPages;
  useEffect(() => {
    if (!open || !hasMore || loading || loadingMore) return;
    const el = loadMoreRef.current;
    const scrollParent = scrollContainerRef.current?.closest('[data-slot="sheet-content"]') ?? scrollContainerRef.current?.parentElement ?? null;
    if (!el || !scrollParent) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: scrollParent, rootMargin: '200px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, hasMore, loading, loadingMore, loadMore]);

  // Escuchar cambios en tiempo real de contactos
  useContactsRealtime({
    studioSlug,
    enabled: open,
    onContactUpdated: () => {
      loadInitial();
    },
    onContactInserted: () => {
      loadInitial();
    },
    onContactDeleted: (contactId) => {
      // Remover contacto del estado local
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    },
  });

  // Abrir modal automáticamente si hay initialContactId
  const initialContactIdRef = useRef(initialContactId);
  useEffect(() => {
    initialContactIdRef.current = initialContactId;
  }, [initialContactId]);

  useEffect(() => {
    if (open && initialContactIdRef.current) {
      setEditingContactId(initialContactIdRef.current);
      setIsModalOpen(true);
      isModalOpenRef.current = true;
    }
  }, [open]);

  const handleCloseModal = useCallback(() => {
    // Usar setTimeout para evitar que el Sheet se cierre durante la transición
    setTimeout(() => {
      setIsModalOpen(false);
      isModalOpenRef.current = false;
      setEditingContactId(null);
    }, 100);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingContactId(null);
    setIsModalOpen(true);
    isModalOpenRef.current = true;
  }, []);

  const handleEdit = useCallback((contactId: string) => {
    setEditingContactId(contactId);
    setIsModalOpen(true);
    isModalOpenRef.current = true;
  }, []);

  const handleContactClick = useCallback((contactId: string) => {
    handleEdit(contactId);
  }, [handleEdit]);

  const handleDelete = (contactId: string) => {
    setDeletingContactId(contactId);
    isDeleteModalOpenRef.current = true;
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingContactId) return;

    try {
      const result = await deleteContact(studioSlug, deletingContactId);
      if (result.success) {
        toast.success('Contacto eliminado');
        setContacts((prev) => prev.filter((c) => c.id !== deletingContactId));
        setTotal((prev) => Math.max(0, prev - 1));
      } else {
        toast.error(result.error || 'Error al eliminar contacto');
      }
    } catch (error) {
      console.error('Error al eliminar contacto:', error);
      toast.error('Error al eliminar contacto');
    } finally {
      isDeleteModalOpenRef.current = false;
      setIsDeleteModalOpen(false);
      setDeletingContactId(null);
    }
  };

  const loadInitialRef = useRef(loadInitial);
  useEffect(() => {
    loadInitialRef.current = loadInitial;
  }, [loadInitial]);

  // Usar ref para editingContactId para evitar problemas de timing
  const editingContactIdRef = useRef(editingContactId);
  useEffect(() => {
    editingContactIdRef.current = editingContactId;
  }, [editingContactId]);

  const handleModalSuccess = useCallback((contact?: Contact, wasEditing?: boolean) => {
    // Si contact es undefined, significa que se eliminó
    if (!contact && wasEditing && editingContactIdRef.current) {
      const deletedId = editingContactIdRef.current;
      // Eliminar contacto del estado local
      setContacts((prev) => prev.filter((c) => c.id !== deletedId));
      setTotal((prev) => Math.max(0, prev - 1));
      // Recargar para actualizar paginación
      setTimeout(() => {
        loadContactsRef.current();
      }, 200);
    } else if (contact) {
      // Usar el flag pasado directamente
      if (wasEditing) {
        // Emitir evento de actualización para sincronizar otros componentes
        triggerContactUpdate(contact.id, contact);
        
        // Actualizar contacto existente en el estado local inmediatamente
        setContacts((prev) =>
          prev.map((c) => (c.id === contact.id ? contact : c))
        );
        // Recargar para obtener datos completos actualizados (con relaciones)
        // pero mantener el contacto actualizado si no está en la respuesta
        setTimeout(async () => {
          const result = await getContacts(studioSlug, {
            page: 1,
            limit: 20,
            search: search || undefined,
            status: statusFilter,
          });
          if (result.success && result.data) {
            const updatedContactInResponse = result.data.contacts.find((c: Contact) => c.id === contact.id);
            if (updatedContactInResponse) {
              setContacts(result.data.contacts);
            } else {
              setContacts((prev) => {
                const withoutUpdated = prev.filter((c) => c.id !== contact.id);
                return [contact, ...withoutUpdated];
              });
            }
            setTotalPages(result.data.totalPages);
            setTotal(result.data.total);
          }
        }, 200);
      } else {
        setContacts((prev) => [contact, ...prev]);
        setTotal((prev) => prev + 1);
        setTimeout(() => {
          loadInitialRef.current();
        }, 200);
      }
    }

    // Cerrar modal después de actualizar el estado
    setTimeout(() => {
      setIsModalOpen(false);
      isModalOpenRef.current = false;
      setEditingContactId(null);
    }, 100);
  }, [studioSlug, search, statusFilter]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: 'all' | 'prospecto' | 'cliente') => {
    setStatusFilter(value);
    setPage(1);
  };

  // Escuchar actualizaciones de avatar en tiempo real (solo para avatar_url)
  const handleContactUpdateFromEvent = useCallback((updatedContact: Contact | undefined) => {
    if (!updatedContact) return;
    
    // Actualizar solo el avatar_url del contacto en la lista si está presente
    setContacts((prev) => {
      const contactIndex = prev.findIndex((c) => c.id === updatedContact.id);
      if (contactIndex !== -1) {
        // Actualizar solo el avatar_url, mantener el resto de los datos
        const updated = [...prev];
        updated[contactIndex] = {
          ...updated[contactIndex],
          avatar_url: updatedContact.avatar_url
        };
        return updated;
      }
      return prev;
    });
  }, []);

  // Escuchar actualizaciones de avatar de todos los contactos en la lista actual
  useEffect(() => {
    if (!open) return;

    const eventHandler = ((event: CustomEvent) => {
      const { contactId, contact } = event.detail || {};
      if (contactId && contact && contact.avatar_url !== undefined) {
        // Solo actualizar si el evento incluye avatar_url (actualización de avatar)
        handleContactUpdateFromEvent(contact);
      }
    }) as EventListener;
    
    window.addEventListener('contact-update', eventHandler);

    return () => {
      window.removeEventListener('contact-update', eventHandler);
    };
  }, [open, handleContactUpdateFromEvent]);

  // Prevenir que el Sheet se cierre cuando el modal está abierto
  const handleSheetOpenChange = useCallback((newOpen: boolean) => {
    // No cerrar el sheet si el modal de edición o el de confirmación de eliminar están abiertos
    if (!newOpen && (isModalOpen || isModalOpenRef.current || isDeleteModalOpen || isDeleteModalOpenRef.current)) {
      return;
    }
    onOpenChange(newOpen);
  }, [isModalOpen, isDeleteModalOpen, onOpenChange]);

  return (
    <>
      {/* Overlay custom del Sheet - solo visible cuando ningún modal está abierto */}
      {open && !isModalOpen && !isDeleteModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[49] animate-in fade-in-0"
          onClick={() => {
            if (!isModalOpenRef.current && !isDeleteModalOpenRef.current) {
              onOpenChange(false);
            }
          }}
        />
      )}

      <Sheet
        open={open}
        onOpenChange={handleSheetOpenChange}
        modal={false}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-0"
          showOverlay={false}
          onInteractOutside={(e) => {
            if (isModalOpen || isModalOpenRef.current || isDeleteModalOpen || isDeleteModalOpenRef.current) {
              return;
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isModalOpen || isModalOpenRef.current || isDeleteModalOpen || isDeleteModalOpenRef.current) {
              e.preventDefault();
            }
          }}
        >
          <div className="p-0">
            <SheetHeader className="border-b border-zinc-800 pb-4 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <ContactRound className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <SheetTitle className="text-xl font-semibold text-white">
                    Contactos
                  </SheetTitle>
                  <SheetDescription className="text-zinc-400">
                    Gestiona tus contactos y prospectos
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div ref={scrollContainerRef} className="p-6 space-y-4">
              {/* Header con búsqueda y filtros */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1 w-full">
                  <ZenInput
                    id="search"
                    placeholder="Buscar por nombre, teléfono o email..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    icon={Search}
                    iconClassName="h-4 w-4"
                  />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <ZenSelect
                    value={statusFilter}
                    onValueChange={(value) =>
                      handleStatusFilterChange(value as 'all' | 'prospecto' | 'cliente')
                    }
                    options={[
                      { value: 'all', label: 'Todos' },
                      { value: 'prospecto', label: 'Prospectos' },
                      { value: 'cliente', label: 'Clientes' },
                    ]}
                    className="w-full sm:w-[140px]"
                    disableSearch
                  />

                  <ZenButton onClick={handleCreate} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo
                  </ZenButton>
                </div>
              </div>

              {/* Google Contacts Integration */}
              {isGoogleContactsConnected ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Users className="h-4 w-4 text-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-zinc-300">
                          Google Contacts conectado
                        </span>
                        <ZenBadge variant="success" size="sm">
                          Activo
                        </ZenBadge>
                      </div>
                      {googleContactsEmail && (
                        <div className="text-xs text-zinc-500 mt-0.5 truncate">
                          {googleContactsEmail}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-700">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400">
                      Sincroniza tus contactos con Google Contacts
                    </span>
                  </div>
                  <ZenButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleConnectGoogleContacts}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Conectar
                  </ZenButton>
                </div>
              )}

              {/* Contador */}
              <div className="text-sm text-zinc-400 min-h-[20px]">
                {loading ? (
                  <span className="text-zinc-500">Filtrando...</span>
                ) : (
                  <span>
                    {total} {total === 1 ? 'contacto' : 'contactos'}
                  </span>
                )}
              </div>

              {/* Vista de tarjetas */}
              <ContactsCardView
                contacts={contacts}
                loading={loading}
                onContactClick={handleContactClick}
                onEdit={handleEdit}
                onDelete={handleDelete}
                studioSlug={studioSlug}
              />

              {/* Sentinel para scroll infinito */}
              {hasMore && !loading && (
                <div ref={loadMoreRef} className="min-h-[40px] flex items-center justify-center py-4">
                  {loadingMore && (
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal de edición/creación */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        contactId={editingContactId}
        studioSlug={studioSlug}
        onSuccess={handleModalSuccess}
      />

      {/* Modal de confirmación de eliminación */}
      <ZenConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          isDeleteModalOpenRef.current = false;
          setIsDeleteModalOpen(false);
          setDeletingContactId(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar contacto"
        description="¿Estás seguro de que deseas eliminar este contacto? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />

      {/* Modal de conexión Google Contacts */}
      <GoogleContactsConnectionModal
        isOpen={showGoogleContactsModal}
        onClose={() => setShowGoogleContactsModal(false)}
        onConnect={handleConfirmConnectGoogleContacts}
        connecting={false}
      />
    </>
  );
}

