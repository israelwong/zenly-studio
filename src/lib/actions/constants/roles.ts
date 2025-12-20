import { USER_ROLES } from "./status";

export const ROLE_PERMISSIONS = {
    super_admin: {
        studio: ["create", "read", "update", "delete"],
        lead: ["create", "read", "update", "delete"],
        agent: ["create", "read", "update", "delete"],
        plan: ["create", "read", "update", "delete"],
        platform: ["read", "update"],
        client: ["create", "read", "update", "delete"],
        quote: ["create", "read", "update", "delete"],
        report: ["read"],
        analytics: ["read"],
    },
    agente: {
        studio: ["read"],
        lead: ["create", "read", "update", "delete"],
        client: ["read", "update"],
        quote: ["read", "update"],
        report: ["read"],
        analytics: ["read"],
    },
    suscriptor: {
        studio: ["read", "update"], // Solo su propio studio
        lead: ["create", "read", "update", "delete"], // Solo sus leads
        client: ["create", "read", "update", "delete"], // Solo sus clientes
        quote: ["create", "read", "update", "delete"], // Solo sus cotizaciones
        finance: ["read"], // Solo sus finanzas
        report: ["read"], // Solo sus reportes
        analytics: ["read"], // Solo sus analytics
    },
} as const;

export const ROLE_DESCRIPTIONS = {
    [USER_ROLES.SUPER_ADMIN]: "Administrador de la plataforma con acceso completo",
    [USER_ROLES.AGENTE]: "Agente de soporte con acceso a estudios asignados",
    [USER_ROLES.SUSCRIPTOR]: "Propietario de estudio con acceso limitado a su negocio",
} as const;

// Función para verificar permisos
export function hasPermission(
    role: string,
    resource: string,
    action: string
): boolean {
    const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
    if (!permissions) return false;

    const resourcePermissions = permissions[resource as keyof typeof permissions];
    if (!resourcePermissions) return false;

    return (resourcePermissions as readonly string[]).includes(action);
}

// Función para obtener todos los permisos de un rol
export function getRolePermissions(role: string) {
    return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || {};
}

// Función para obtener descripción del rol
export function getRoleDescription(role: string): string {
    return ROLE_DESCRIPTIONS[role as keyof typeof ROLE_DESCRIPTIONS] || "Rol desconocido";
}
