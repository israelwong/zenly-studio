'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { User, Search, Plus, Users as UsersIcon } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenInput, ZenBadge } from '@/components/ui/zen';
import { getContacts } from '@/lib/actions/studio/commercial/contacts';
import { ContactModal } from '@/components/shared/contacts/ContactModal';
import { Contact } from '@/lib/actions/schemas/contacts-schemas';
import { toast } from 'sonner';
import { GoogleBundleModal } from '@/components/shared/integrations/GoogleBundleModal';
import { obtenerEstadoConexion } from '@/lib/integrations/google';

export default function ClientesPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter] = useState<'cliente'>('cliente');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [isGoogleContactsConnected, setIsGoogleContactsConnected] = useState(false);
  const [googleContactsEmail, setGoogleContactsEmail] = useState<string | null>(null);
  const [showGoogleBundleModal, setShowGoogleBundleModal] = useState(false);
  const [checkingGoogleStatus, setCheckingGoogleStatus] = useState(true);

  const verificarEstadoGoogle = useCallback(async () => {
    try {
      setCheckingGoogleStatus(true);
      const status = await obtenerEstadoConexion(studioSlug);
      const hasContactsScope = status.scopes?.some((scope) => scope.includes('contacts')) || false;
      
      setIsGoogleContactsConnected(hasContactsScope && !!status.email);
      setGoogleContactsEmail(status.email || null);
    } catch (error) {
      console.error('Error verificando estado de Google:', error);
      setIsGoogleContactsConnected(false);
      setGoogleContactsEmail(null);
    } finally {
      setCheckingGoogleStatus(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    document.title = 'Zenly Studio - Clientes';
    verificarEstadoGoogle();

    // Escuchar cambios en la conexión de Google Contacts
    const handleConnectionChange = () => {
      verificarEstadoGoogle();
    };
    window.addEventListener('google-contacts-connection-changed', handleConnectionChange);

    return () => {
      window.removeEventListener('google-contacts-connection-changed', handleConnectionChange);
    };
  }, [verificarEstadoGoogle]);

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
        toast.error(result.error || 'Error al cargar clientes');
      }
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [studioSlug, page, search, statusFilter]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };


  const handleContactClick = (contactId: string) => {
    router.push(`/${studioSlug}/studio/business/clientes/${contactId}`);
  };

  const handleCreateContact = () => {
    setEditingContactId(null);
    setIsModalOpen(true);
  };

  const handleEditContact = (contactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingContactId(contactId);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (contact?: Contact) => {
    if (contact) {
      loadContacts();
    }
    setIsModalOpen(false);
    setEditingContactId(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col">
      <ZenCard variant="default" padding="none" className="flex flex-col flex-1 min-h-0">
        <ZenCardHeader className="border-b border-zinc-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <User className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <ZenCardTitle>Clientes</ZenCardTitle>
                <ZenCardDescription>
                  Gestiona clientes y entregables
                </ZenCardDescription>
              </div>
            </div>
            <ZenButton onClick={handleCreateContact}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </ZenButton>
          </div>
        </ZenCardHeader>

        <ZenCardContent className="p-6 flex-1 min-h-0 overflow-hidden">
          {/* Barra de herramientas */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <ZenInput
                  placeholder="Buscar por nombre, teléfono o email..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="text-sm text-zinc-400 shrink-0">
              {loading ? (
                <span className="text-zinc-500">Cargando...</span>
              ) : (
                <span>
                  {contacts.length} {contacts.length === 1 ? 'cliente' : 'clientes'}
                </span>
              )}
            </div>
            <div className="h-5 w-px bg-zinc-700 shrink-0" />
            {!checkingGoogleStatus && (
              isGoogleContactsConnected ? (
                <ZenBadge variant="success" size="sm" className="gap-1 shrink-0">
                  <UsersIcon className="h-3 w-3" />
                  Google Contacts
                </ZenBadge>
              ) : (
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGoogleBundleModal(true)}
                  className="h-7 px-2 text-xs gap-1 shrink-0"
                >
                  <UsersIcon className="h-3 w-3" />
                  Conectar Google
                </ZenButton>
              )
            )}
          </div>

          {/* Lista de contactos */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800"
                >
                  {/* Avatar skeleton */}
                  <div className="h-12 w-12 rounded-full bg-zinc-800 animate-pulse shrink-0" />
                  {/* Contenido skeleton */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                    </div>
                  </div>
                  {/* Botón skeleton */}
                  <div className="h-7 w-16 bg-zinc-800 rounded animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="h-12 w-12 text-zinc-600 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-300 mb-2">
                No hay clientes
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
                {search ? 'No se encontraron resultados' : 'Comienza agregando tu primer cliente'}
              </p>
              {!search && (
                <ZenButton onClick={handleCreateContact}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Cliente
                </ZenButton>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleContactClick(contact.id)}
                    className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors group"
                  >
                    <div className="shrink-0">
                      {contact.avatar_url ? (
                        <img
                          src={contact.avatar_url}
                          alt={contact.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-zinc-700 flex items-center justify-center">
                          <User className="h-6 w-6 text-zinc-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">{contact.name}</h3>
                        <ZenBadge
                          variant={contact.status === 'cliente' ? 'default' : 'secondary'}
                          size="sm"
                        >
                          {contact.status === 'cliente' ? 'Cliente' : 'Prospecto'}
                        </ZenBadge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-400">
                        {contact.phone && (
                          <span className="truncate">{contact.phone}</span>
                        )}
                        {contact.email && (
                          <span className="truncate">{contact.email}</span>
                        )}
                      </div>
                    </div>
                    <ZenButton
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleEditContact(contact.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Editar
                    </ZenButton>
                  </div>
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                  <p className="text-sm text-zinc-400">
                    Mostrando {((page - 1) * 20) + 1} - {Math.min(page * 20, total)} de {total}
                  </p>
                  <div className="flex gap-2">
                    <ZenButton
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </ZenButton>
                    <ZenButton
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Siguiente
                    </ZenButton>
                  </div>
                </div>
              )}
            </>
          )}
        </ZenCardContent>
      </ZenCard>

      {/* Modal de contacto */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingContactId(null);
        }}
        contactId={editingContactId || undefined}
        studioSlug={studioSlug}
        onSuccess={handleModalSuccess}
      />

      {/* Modal de integración Google */}
      <GoogleBundleModal
        isOpen={showGoogleBundleModal}
        onClose={() => {
          setShowGoogleBundleModal(false);
          verificarEstadoGoogle();
        }}
        studioSlug={studioSlug}
        context="contacts"
      />
    </div>
  );
}
