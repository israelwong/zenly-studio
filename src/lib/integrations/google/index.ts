/**
 * Barrel export para integraciones de Google
 * 
 * Estructura:
 * - auth/ - OAuth y autenticación
 * - clients/ - Clientes de API
 * - sync/ - Sincronización de datos
 * - studio/ - Operaciones a nivel studio
 */

// OAuth y Autenticación
export * from './auth/unified.actions';
export * from './auth/calendar.actions';
export * from './auth/contacts.actions';
export * from './auth/drive.actions';
export * from './auth/disconnect/calendar.actions';
export * from './auth/disconnect/contacts.actions';

// Re-exportar funciones de conteo con nombres más claros
export { obtenerConteoEventosSincronizados } from './auth/disconnect/calendar.actions';
export { obtenerConteoContactosSincronizados } from './auth/disconnect/contacts.actions';

// Re-exportar funciones con nombres alternativos para compatibilidad
export { iniciarConexionGoogleDrive as iniciarConexionGoogle } from './auth/drive.actions';
export { procesarCallbackGoogleDrive as procesarCallbackGoogle } from './auth/drive.actions';

// Clientes de API
export * from './clients/contacts.client';
export * from './clients/drive.client';
export * from './clients/calendar/client';
export * from './clients/calendar/calendar-manager';
export * from './clients/calendar/sync-manager';

// Sincronización
export * from './sync/contacts.actions';

// Operaciones Studio
export * from './studio/status.actions';
export * from './studio/drive.actions';

