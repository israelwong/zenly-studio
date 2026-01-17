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
      <div className="grid grid-cols-1 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-zinc-800/50 rounded-lg p-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-zinc-700 rounded w-3/4 mb-1" />
                <div className="h-3 bg-zinc-700 rounded w-1/2" />
              </div>
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
    <div className="grid grid-cols-1 gap-3">
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
            className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 hover:border-zinc-600 transition-all cursor-pointer group"
            onClick={() => onContactClick(contact.id)}
          >
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={contact.avatar_url || undefined} alt={contact.name} />
                <AvatarFallback className="bg-blue-600/20 text-blue-400 text-xs">
                  {initials || <ContactRound className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-white truncate group-hover:text-blue-400 transition-colors text-sm">
                    {contact.name}
                  </h3>
                  {getStatusBadge(contact.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  {contact.phone && (
                    <span className="truncate">{contact.phone}</span>
                  )}
                  {contact.email && (
                    <>
                      <span>•</span>
                      <span className="truncate">{contact.email}</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-zinc-500 mt-1 truncate">
                  Canal: {getCanalDisplay(contact)}
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
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
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
          </div>
        );
      })}
    </div>
  );
}

