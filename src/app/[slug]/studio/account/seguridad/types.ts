// ========================================
// TIPOS DE SEGURIDAD - ITERACIÓN 1
// ========================================

export interface SecuritySettings {
    id: string;
    user_id: string;
    email_notifications: boolean;
    device_alerts: boolean;
    session_timeout: number;
    created_at: Date;
    updated_at: Date;
}

export interface AccessLog {
    id: string;
    user_id: string;
    action: string;
    ip_address: string | null;
    user_agent: string | null;
    success: boolean;
    details: unknown;
    created_at: Date;
}

export interface PasswordChangeData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export interface SecurityFormData {
    email_notifications: boolean;
    device_alerts: boolean;
    session_timeout: number;
}

// Tipos para acciones de seguridad
export type SecurityAction =
    | 'login'
    | 'logout'
    | 'password_change'
    | 'session_created'
    | 'session_ended'
    | 'security_settings_updated';

// Tipos para filtros de logs
export interface AccessLogFilters {
    action?: string;
    success?: boolean;
    date_from?: Date;
    date_to?: Date;
    limit?: number;
    offset?: number;
}
