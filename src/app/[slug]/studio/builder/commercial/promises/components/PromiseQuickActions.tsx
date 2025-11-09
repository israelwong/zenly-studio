'use client';

import React from 'react';
import { Share2, MessageCircle, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import {
  logWhatsAppSent,
  logCallMade,
  logProfileShared,
  logEmailSent,
} from '@/lib/actions/studio/builder/commercial/promises';

interface PromiseQuickActionsProps {
  studioSlug: string;
  contactId: string;
  contactName: string;
  phone: string;
  email?: string | null;
  promiseId?: string | null;
}

export function PromiseQuickActions({
  studioSlug,
  contactId,
  contactName,
  phone,
  email,
  promiseId,
}: PromiseQuickActionsProps) {
  const handleWhatsApp = async () => {
    const message = encodeURIComponent(`Hola ${contactName}, te contacto desde ZEN`);
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`;
    
    // Registrar log si hay promiseId
    if (promiseId) {
      logWhatsAppSent(studioSlug, promiseId, contactName, phone).catch((error) => {
        console.error('Error registrando WhatsApp:', error);
      });
    }
    
    window.open(whatsappUrl, '_blank');
  };

  const handleCall = async () => {
    // Registrar log si hay promiseId
    if (promiseId) {
      logCallMade(studioSlug, promiseId, contactName, phone).catch((error) => {
        console.error('Error registrando llamada:', error);
      });
    }
    
    window.open(`tel:${phone}`, '_self');
  };

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/${studioSlug}/cliente/profile/${contactId}`;
    
    // Registrar log si hay promiseId
    if (promiseId) {
      logProfileShared(studioSlug, promiseId, contactName, profileUrl).catch((error) => {
        console.error('Error registrando perfil compartido:', error);
      });
    }
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Perfil de ${contactName}`,
          text: `Revisa el perfil de ${contactName}`,
          url: profileUrl,
        });
      } catch (error) {
        // Usuario canceló el share
      }
    } else {
      await navigator.clipboard.writeText(profileUrl);
      toast.success('Link copiado al portapapeles');
    }
  };

  const handleSharePromise = () => {
    if (!promiseId) {
      toast.error('La promesa debe estar guardada para compartir');
      return;
    }

    const previewUrl = `${window.location.origin}/${studioSlug}/preview/${promiseId}`;
    
    // Registrar log
    logProfileShared(studioSlug, promiseId, contactName, previewUrl).catch((error) => {
      console.error('Error registrando promesa compartida:', error);
    });
    
    // Abrir en nueva ventana
    window.open(previewUrl, '_blank');
  };

  const handleEmail = async () => {
    // Registrar log si hay promiseId
    if (promiseId && email) {
      logEmailSent(studioSlug, promiseId, contactName, email).catch((error) => {
        console.error('Error registrando email:', error);
      });
    }
    
    window.open(`mailto:${email}`, '_self');
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleWhatsApp}
        className="px-3 py-2 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2 text-sm"
        title="WhatsApp"
        aria-label="Abrir WhatsApp"
      >
        <MessageCircle className="h-4 w-4" />
        <span>WhatsApp</span>
      </button>
      <button
        onClick={handleCall}
        className="px-3 py-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2 text-sm"
        title="Llamar"
        aria-label="Llamar"
      >
        <Phone className="h-4 w-4" />
        <span>Llamar</span>
      </button>
      {email && (
        <button
          onClick={handleEmail}
          className="px-3 py-2 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2 text-sm"
          title="Email"
          aria-label="Enviar email"
        >
          <Mail className="h-4 w-4" />
          <span>Email</span>
        </button>
      )}
      <button
        onClick={handleSharePromise}
        className="px-3 py-2 rounded-lg bg-zinc-600/10 hover:bg-zinc-600/20 text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-2 text-sm"
        title="Compartir promesa"
        aria-label="Compartir promesa"
        disabled={!promiseId}
      >
        <Share2 className="h-4 w-4" />
        <span>Compartir</span>
      </button>
    </div>
  );
}

