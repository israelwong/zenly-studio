// Tipos compartidos para la vista unificada Cuenta

export interface PerfilData {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PerfilFormData {
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
}

// Re-exportar tipos de seguridad para componentes compartidos
export type {
  SecuritySettings,
  AccessLog,
  PasswordChangeData,
  SecurityFormData,
  SecurityAction,
  AccessLogFilters,
} from '@/app/[slug]/studio/config/account/seguridad/types';
