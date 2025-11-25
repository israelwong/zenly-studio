'use client';

import React, { useState, useEffect } from 'react';
import { Edit, ContactRound } from 'lucide-react';
import { useContactsSheet } from '@/components/shared/contacts/ContactsSheetContext';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { getContactById } from '@/lib/actions/studio/commercial/contacts/contacts.actions';

interface EventClientInfoCardProps {
  studioSlug: string;
  contactId: string;
  initialData?: {
    name: string;
    phone: string;
    email: string | null;
    avatar_url?: string | null;
  };
  onContactUpdated?: (contact: { id: string; name: string; phone: string; email: string | null }) => void;
}

export function EventClientInfoCard({
  studioSlug,
  contactId,
  initialData,
  onContactUpdated,
}: EventClientInfoCardProps) {
  const { openContactsSheet } = useContactsSheet();
  const [contact, setContact] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (!initialData && contactId) {
      setLoading(true);
      getContactById(studioSlug, contactId)
        .then((result) => {
          if (result.success && result.data) {
            const contactData = {
              name: result.data.name,
              phone: result.data.phone,
              email: result.data.email,
              avatar_url: result.data.avatar_url,
            };
            setContact(contactData);
          }
        })
        .catch((error) => {
          console.error('Error loading contact:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (initialData) {
      setContact(initialData);
    }
  }, [contactId, studioSlug, initialData]);

  const handleEdit = () => {
    if (contactId) {
      openContactsSheet(contactId);
    }
  };

  if (loading) {
    return (
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3">
          <ZenCardTitle className="text-sm font-medium">Cliente</ZenCardTitle>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          <div className="space-y-3">
            <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
          </div>
        </ZenCardContent>
      </ZenCard>
    );
  }

  if (!contact) {
    return null;
  }

  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ZenCard>
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
            Cliente
          </ZenCardTitle>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-300"
          >
            <Edit className="h-3.5 w-3.5" />
          </ZenButton>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage
              src={contact.avatar_url || undefined}
              alt={contact.name}
            />
            <AvatarFallback className="bg-emerald-600/20 text-emerald-400 border border-emerald-600/30">
              {initials || <ContactRound className="h-6 w-6" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm text-zinc-200 font-medium">{contact.name}</p>
            <p className="text-sm text-zinc-400">{contact.phone}</p>
            {contact.email && (
              <p className="text-sm text-zinc-400">{contact.email}</p>
            )}
          </div>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

