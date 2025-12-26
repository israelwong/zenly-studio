'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Cloud, Calendar, MessageSquare, CreditCard, Sparkles, LucideIcon } from 'lucide-react';
import { obtenerEstadoConexion } from '@/lib/actions/studio/integrations';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenCardContent } from '@/components/ui/zen';
import {
  IntegrationCard,
  GoogleDriveIntegrationModal,
  CalendarIntegrationModal,
  ManychatIntegrationModal,
  StripeIntegrationModal,
  ZenMagicIntegrationModal,
} from '@/components/shared/integrations';

type IntegrationId = 'calendar' | 'google-drive' | 'manychat' | 'stripe' | 'zen-magic';

interface Integration {
  id: IntegrationId;
  name: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  isComingSoon: boolean;
  isConnected?: boolean;
}

export default function IntegracionesPage() {
  const params = useParams();

  useEffect(() => {
    document.title = 'ZEN Studio - Integraciones';
  }, []);
  const studioSlug = params?.slug as string;

  const [scopes, setScopes] = useState<string[]>([]);
  const [openModal, setOpenModal] = useState<IntegrationId | null>(null);

  const loadConnectionStatus = useCallback(async () => {
    if (!studioSlug) return;
    const status = await obtenerEstadoConexion(studioSlug);
    setScopes(status.scopes || []);
  }, [studioSlug]);

  useEffect(() => {
    loadConnectionStatus();
  }, [loadConnectionStatus]);

  const hasDriveScope = scopes.some((scope) => scope.includes('drive'));

  const integrations: Integration[] = [
    {
      id: 'calendar',
      name: 'Calendar',
      description: 'Sincroniza tu agenda con Google Calendar automáticamente',
      icon: Calendar,
      iconColor: 'text-purple-400',
      isComingSoon: true,
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      description: 'Vincula carpetas de Google Drive a tus entregables para optimizar almacenamiento',
      icon: Cloud,
      iconColor: 'text-blue-400',
      isComingSoon: false,
      isConnected: hasDriveScope,
    },
    {
      id: 'manychat',
      name: 'Manychat',
      description: 'Automatiza conversaciones y respuestas con tus clientes',
      icon: MessageSquare,
      iconColor: 'text-green-400',
      isComingSoon: true,
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Procesa pagos de forma segura con Stripe',
      icon: CreditCard,
      iconColor: 'text-indigo-400',
      isComingSoon: true,
    },
    {
      id: 'zen-magic',
      name: 'ZEN Magic',
      description: 'Asistente virtual dinámico para automatización de tareas',
      icon: Sparkles,
      iconColor: 'text-yellow-400',
      isComingSoon: true,
    },
  ];

  const handleConnect = (integrationId: IntegrationId) => {
    setOpenModal(integrationId);
  };

  const handleManage = (integrationId: IntegrationId) => {
    setOpenModal(integrationId);
  };

  const handleCloseModal = () => {
    setOpenModal(null);
    loadConnectionStatus();
  };

  if (!studioSlug) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col">
      <ZenCard variant="default" padding="none" className="flex flex-col flex-1 min-h-0">
        <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Cloud className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <ZenCardTitle>Integraciones</ZenCardTitle>
              <ZenCardDescription>
                Conecta herramientas externas para potenciar tu flujo de trabajo
              </ZenCardDescription>
            </div>
          </div>
        </ZenCardHeader>

        <ZenCardContent className="p-6 flex-1 min-h-0 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                name={integration.name}
                description={integration.description}
                icon={integration.icon}
                iconColor={integration.iconColor}
                isConnected={integration.isConnected}
                isComingSoon={integration.isComingSoon}
                onConnect={!integration.isComingSoon ? () => handleConnect(integration.id) : undefined}
                onManage={integration.isConnected && !integration.isComingSoon ? () => handleManage(integration.id) : undefined}
              />
            ))}
          </div>
        </ZenCardContent>
      </ZenCard>

      {/* Modales */}
      {studioSlug && (
        <>
          <GoogleDriveIntegrationModal
            isOpen={openModal === 'google-drive'}
            onClose={handleCloseModal}
            studioSlug={studioSlug}
            onConnected={loadConnectionStatus}
          />
          <CalendarIntegrationModal
            isOpen={openModal === 'calendar'}
            onClose={handleCloseModal}
            studioSlug={studioSlug}
          />
          <ManychatIntegrationModal
            isOpen={openModal === 'manychat'}
            onClose={handleCloseModal}
            studioSlug={studioSlug}
          />
          <StripeIntegrationModal
            isOpen={openModal === 'stripe'}
            onClose={handleCloseModal}
            studioSlug={studioSlug}
          />
          <ZenMagicIntegrationModal
            isOpen={openModal === 'zen-magic'}
            onClose={handleCloseModal}
            studioSlug={studioSlug}
          />
        </>
      )}
    </div>
  );
}

