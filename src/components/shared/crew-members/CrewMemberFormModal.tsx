'use client';

import React from 'react';
import { ZenDialog } from '@/components/ui/zen';
import { CrewMemberForm } from './CrewMemberForm';

interface CrewMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tipo: string;
  status: string;
  skills: Array<{
    id: string;
    name: string;
    color: string | null;
    icono: string | null;
    is_primary: boolean;
  }>;
  fixed_salary: number | null;
  salary_frequency?: string | null;
  variable_salary: number | null;
  account: {
    id: string;
    email: string;
    is_active: boolean;
  } | null;
}

interface CrewMemberFormModalProps {
  studioSlug: string;
  isOpen: boolean;
  onClose: () => void;
  initialMember?: CrewMember | null;
  onSuccess: (payload: Record<string, unknown>) => void;
  onDelete?: () => void;
}

export function CrewMemberFormModal({
  studioSlug,
  isOpen,
  onClose,
  initialMember,
  onSuccess,
  onDelete,
}: CrewMemberFormModalProps) {
  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialMember ? 'Editar Personal' : 'Crear Personal'}
      description={
        initialMember
          ? 'Actualiza la información del miembro del equipo'
          : 'Agrega un nuevo miembro a tu equipo de trabajo'
      }
      maxWidth="lg"
      showCloseButton={true}
      closeOnClickOutside={false}
      zIndex={9999}
    >
      <CrewMemberForm
        studioSlug={studioSlug}
        initialMember={initialMember}
        onSuccess={onSuccess}
        onCancel={onClose}
        onDelete={onDelete}
      />
    </ZenDialog>
  );
}

