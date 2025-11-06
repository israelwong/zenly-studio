'use client';

import React from 'react';
import { ZenDialog } from '@/components/ui/zen';
import { PromiseForm } from './PromiseForm';

interface PromiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  onSuccess: () => void;
}

export function PromiseModal({
  isOpen,
  onClose,
  studioSlug,
  onSuccess,
}: PromiseModalProps) {
  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Promesa"
      maxWidth="2xl"
      onCancel={onClose}
    >
      <PromiseForm
        studioSlug={studioSlug}
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
      />
    </ZenDialog>
  );
}
