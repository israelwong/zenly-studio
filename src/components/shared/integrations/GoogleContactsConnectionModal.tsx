'use client';

import { Users, UserPlus, ExternalLink, Phone, Mail } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';

interface GoogleContactsConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
  connecting?: boolean;
}

export function GoogleContactsConnectionModal({
  isOpen,
  onClose,
  onConnect,
  connecting = false,
}: GoogleContactsConnectionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="bg-zinc-900 border-zinc-800 max-w-lg"
        overlayZIndex={10100}
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-zinc-100 flex items-center gap-2">
            <Users className="h-5 w-5 text-green-400" />
            Sincroniza tus contactos con Google
          </DialogTitle>
          <DialogDescription className="text-zinc-400 pt-2">
            Conecta tu cuenta de Google Contacts para sincronizar automáticamente tus contactos y
            personal. Puedes usar una cuenta diferente a la de tu inicio de sesión.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sección 1: Contactos del Estudio */}
          <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <UserPlus className="h-4 w-4 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-zinc-200 mb-1">
                  Contactos del Estudio
                </h3>
                <p className="text-xs text-zinc-400 mb-2">
                  Tus contactos se sincronizarán automáticamente:
                </p>
                <ul className="space-y-1 text-xs text-zinc-400">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                    Nuevos contactos creados en ZEN
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                    Actualizaciones de información de contactos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                    Nombres, teléfonos y emails sincronizados
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sección 2: Personal del Estudio */}
          <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-zinc-200 mb-1">
                  Personal del Estudio
                </h3>
                <p className="text-xs text-zinc-400 mb-2">
                  Tu equipo también se sincronizará:
                </p>
                <div className="text-xs text-zinc-400 space-y-1">
                  <p>
                    Se creará un grupo de contactos llamado{' '}
                    <span className="text-zinc-300 font-medium">"ZEN: [Nombre de tu Estudio]"</span> donde se
                    organizarán todos los contactos sincronizados:
                  </p>
                  <ul className="space-y-1 mt-2 ml-4">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      Miembros del equipo (fotógrafos, editores, etc.)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      Contactos de clientes y prospectos
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Sección 3: Información sincronizada */}
          <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Phone className="h-4 w-4 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-zinc-200 mb-1">
                  Información Sincronizada
                </h3>
                <p className="text-xs text-zinc-400 mb-2">
                  Los siguientes datos se compartirán con Google Contacts:
                </p>
                <ul className="space-y-1 text-xs text-zinc-400">
                  <li className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-purple-400" />
                    Nombres y teléfonos
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-purple-400" />
                    Direcciones de email
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    Información del estudio y notas
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Nota sobre cuenta diferente */}
          <div className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
            <p className="text-xs text-zinc-400 flex items-start gap-2">
              <ExternalLink className="h-3.5 w-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
              <span>
                Puedes usar una cuenta de Google diferente a la de tu inicio de sesión. Esto te
                permite separar tus contactos personales de los contactos de trabajo.
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <ZenButton variant="outline" onClick={onClose} disabled={connecting}>
            Cancelar
          </ZenButton>
          <ZenButton
            variant="primary"
            onClick={onConnect}
            loading={connecting}
            loadingText="Conectando..."
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Entendido, conectar cuenta
          </ZenButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

