'use client';

import React from 'react';
import { ContactRound, Phone, Mail, Edit, MoreVertical } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import { ZenButton, ZenBadge, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import type { Contact } from '@/lib/actions/schemas/contacts-schemas';
import { formatDateTime } from '@/lib/actions/utils/formatting';

interface ContactsCardViewProps {
  contacts: Contact[];
  loading: boolean;
  onContactClick: (contactId: string) => void;
  onEdit: (contactId: string) => void;
  onDelete: (contactId: string) => void;
  studioSlug: string;
}

export function ContactsCardView({
  contacts,
  loading,
  onContactClick,
  onEdit,
  onDelete,
  studioSlug
}: ContactsCardViewProps) {
  const [phoneMenuOpen, setPhoneMenuOpen] = React.useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'success' | 'destructive'> = {
      prospecto: 'default',
      cliente: 'success'
    };
    const labels: Record<string, string> = {
      prospecto: 'Prospecto',
      cliente: 'Cliente'
    };
    return (
      <ZenBadge variant={variants[status] || 'default'} size="sm" className="rounded-full">
        {labels[status] || status}
      </ZenBadge>
    );
  };

  const getCanalDisplay = (contact: Contact) => {
    if (contact.referrer_contact) {
      return `@${contact.referrer_contact.name}`;
    }
    if (contact.social_network) {
      return contact.social_network.name;
    }
    if (contact.acquisition_channel) {
      return contact.acquisition_channel.name;
    }
    return '-';
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
    setPhoneMenuOpen(null);
  };

  const handleSendWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
    setPhoneMenuOpen(null);
  };

  const handleSendEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
    setPhoneMenuOpen(null);
  };

  if (loading && contacts.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-zinc-800/50 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-zinc-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-zinc-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-zinc-700 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-zinc-700 rounded w-full" />
              <div className="h-3 bg-zinc-700 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12">
        <ContactRound className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
        <p className="text-zinc-400">No se encontraron contactos</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {contacts.map((contact) => {
        const initials = contact.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return (
          <div
            key={contact.id}
            className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-all cursor-pointer group"
            onClick={() => onContactClick(contact.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="w-12 h-12 flex-shrink-0">
                  <AvatarImage src={contact.avatar_url || undefined} alt={contact.name} />
                  <AvatarFallback className="bg-blue-600/20 text-blue-400 text-sm">
                    {initials || <ContactRound className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                      {contact.name}
                    </h3>
                    {getStatusBadge(contact.status)}
                  </div>
                  <div className="mt-1 text-sm text-zinc-400 truncate">
                    {contact.phone}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <ZenDropdownMenu
                  open={phoneMenuOpen === contact.id}
                  onOpenChange={(open) => setPhoneMenuOpen(open ? contact.id : null)}
                >
                  <ZenDropdownMenuTrigger asChild>
                    <ZenButton
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </ZenButton>
                  </ZenDropdownMenuTrigger>
                  <ZenDropdownMenuContent align="end">
                    <ZenDropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(contact.id);
                        setPhoneMenuOpen(null);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </ZenDropdownMenuItem>
                    <ZenDropdownMenuSeparator />
                    <ZenDropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCall(contact.phone);
                      }}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Llamar
                    </ZenDropdownMenuItem>
                    <ZenDropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendWhatsApp(contact.phone);
                      }}
                    >
                      <WhatsAppIcon className="mr-2 h-4 w-4" />
                      WhatsApp
                    </ZenDropdownMenuItem>
                    {contact.email && (
                      <ZenDropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendEmail(contact.email!);
                        }}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Email
                      </ZenDropdownMenuItem>
                    )}
                    <ZenDropdownMenuSeparator />
                    <ZenDropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(contact.id);
                        setPhoneMenuOpen(null);
                      }}
                      className="text-red-400 focus:text-red-400"
                    >
                      Eliminar
                    </ZenDropdownMenuItem>
                  </ZenDropdownMenuContent>
                </ZenDropdownMenu>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {contact.email && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
              <div className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-700/50">
                <div className="truncate">Canal: {getCanalDisplay(contact)}</div>
                {contact.updated_at && (
                  <div className="mt-1">
                    {formatDateTime(contact.updated_at)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

