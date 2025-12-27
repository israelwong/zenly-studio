'use client';

import React from 'react';
import { IntegrationCard } from './IntegrationCard';
import { ZenButton } from '@/components/ui/zen';

interface GoogleDriveIntegrationCardProps {
  isConnected: boolean;
  onConnect: () => void;
  onManage: () => void;
}

export function GoogleDriveIntegrationCard({
  isConnected,
  onConnect,
  onManage,
}: GoogleDriveIntegrationCardProps) {
  return (
    <IntegrationCard
      name="Google Drive"
      description="Vincula carpetas de Google Drive a tus entregables para optimizar almacenamiento"
      iconColor="text-blue-400"
      isConnected={isConnected}
      isComingSoon={false}
      onConnect={onConnect}
      onManage={onManage}
      manageLabel="Desconectar"
    >
      {!isConnected ? (
        <ZenButton
          variant="primary"
          size="sm"
          onClick={onConnect}
          className="w-full"
        >
          Conectar
        </ZenButton>
      ) : (
        <ZenButton
          variant="outline"
          size="sm"
          onClick={onManage}
          className="w-full"
        >
          Desconectar
        </ZenButton>
      )}
    </IntegrationCard>
  );
}

