'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ContactRound, Plus, Search } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import { ZenButton, ZenInput, ZenSelect } from '@/components/ui/zen';
import { ContactsCardView } from './ContactsCardView';
import { ContactModal } from './ContactModal';
import { ZenConfirmModal } from '@/components/ui/zen';
import { getContacts, deleteContact } from '@/lib/actions/studio/builder/commercial/contacts';
import type { Contact } from '@/lib/actions/schemas/contacts-schemas';
import { toast } from 'sonner';
import { useContactRefresh, useContactUpdateListener } from '@/hooks/useContactRefresh';

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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'prospecto' | 'cliente'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isModalOpenRef = useRef(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { triggerContactUpdate } = useContactRefresh();

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getContacts(studioSlug, {
        page,
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
  }, [studioSlug, page, search, statusFilter]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      loadContacts();
    } else {
      // Resetear estados del modal cuando se cierra el sheet
      setIsModalOpen(false);
      setEditingContactId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Recargar cuando cambian los filtros o la búsqueda
  useEffect(() => {
    if (open) {
      loadContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, page]);

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
      setIsDeleteModalOpen(false);
      setDeletingContactId(null);
    }
  };

  // Usar ref para loadContacts para evitar que handleModalSuccess se recree
  const loadContactsRef = useRef(loadContacts);
  useEffect(() => {
    loadContactsRef.current = loadContacts;
  }, [loadContacts]);

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
            page,
            limit: 20,
            search: search || undefined,
            status: statusFilter,
          });
          if (result.success && result.data) {
            // Buscar si el contacto actualizado está en la respuesta
            const updatedContactInResponse = result.data.contacts.find((c: Contact) => c.id === contact.id);
            if (updatedContactInResponse) {
              // Si está, usar la respuesta completa
              setContacts(result.data.contacts);
            } else {
              // Si no está (por filtros), mantener el contacto actualizado en el estado
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
        // Agregar nuevo contacto
        setContacts((prev) => [contact, ...prev]);
        setTotal((prev) => prev + 1);
        // Recargar para obtener datos completos
        setTimeout(() => {
          loadContactsRef.current();
        }, 200);
      }
    }

    // Cerrar modal después de actualizar el estado
    setTimeout(() => {
      setIsModalOpen(false);
      isModalOpenRef.current = false;
      setEditingContactId(null);
    }, 100);
  }, [studioSlug, page, search, statusFilter]);

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

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Scroll to top when page changes
    const sheetContent = document.querySelector('[data-slot="sheet-content"]');
    if (sheetContent) {
      sheetContent.scrollTop = 0;
    }
  };

  // Prevenir que el Sheet se cierre cuando el modal está abierto
  const handleSheetOpenChange = useCallback((newOpen: boolean) => {
    // Si el modal está abierto (usando ref para evitar problemas de timing), no permitir que el Sheet se cierre
    if (!newOpen && (isModalOpen || isModalOpenRef.current)) {
      return;
    }
    onOpenChange(newOpen);
  }, [isModalOpen, onOpenChange]);

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={handleSheetOpenChange}
        modal={false}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-3xl bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-0"
          onInteractOutside={(e) => {
            // Prevenir que el Sheet se cierre cuando se interactúa con el modal
            if (isModalOpen) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            // Prevenir que el Sheet se cierre con Escape cuando el modal está abierto
            if (isModalOpen) {
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

            <div className="p-6 space-y-4">
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

              {/* Paginación */}
              {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                  >
                    Anterior
                  </ZenButton>
                  <span className="text-sm text-zinc-400">
                    Página {page} de {totalPages}
                  </span>
                  <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                  >
                    Siguiente
                  </ZenButton>
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
    </>
  );
}

