// =====================================================
// CENTRO DE CONTROL REALTIME - ZENLY STUDIO
// =====================================================
// Control centralizado para activar/desactivar sistemas Realtime
// Útil para debugging, mantenimiento y control granular

export const REALTIME_CONFIG = {
  // Studio - Navbar con identidad del studio
  STUDIO_NAVBAR: true,  // ✅ FUNCIONANDO - Actualizaciones de nombre/isotipo

  // Studio - Notificaciones del navbar
  STUDIO_NOTIFICACIONES: false,  // 🔄 PENDIENTE - Panel de notificaciones

  // Studio - Dashboard en tiempo real
  STUDIO_DASHBOARD: false,  // 🔄 PENDIENTE - Métricas en tiempo real

  // Admin - Panel de administración
  ADMIN_DASHBOARD: false,  // 🔄 PENDIENTE - Estadísticas globales

  // Agente - Gestión de leads
  AGENTE_LEADS: false,  // 🔄 PENDIENTE - Actualizaciones de leads

  // Logs de debug
  ENABLE_REALTIME_LOGS: true,

  // Configuración de rendimiento
  MAX_CONNECTIONS_PER_COMPONENT: 3,
  RECONNECTION_DELAY: 1000,
  MAX_RECONNECTION_ATTEMPTS: 5
};

// Función helper para logs centralizados
export function logRealtime(component: string, message: string, data?: any) {
  if (REALTIME_CONFIG.ENABLE_REALTIME_LOGS) {
    console.log(`🔄 [${component}] ${message}`, data || '');
  }
}

// Función para verificar si un componente puede usar Realtime
export function canUseRealtime(component: string): boolean {
  const config = REALTIME_CONFIG[component as keyof typeof REALTIME_CONFIG];
  return config === true;
}

// Función para obtener configuración de Realtime
export function getRealtimeConfig() {
  return {
    ...REALTIME_CONFIG,
    // Configuración adicional para el cliente
    clientConfig: {
      eventsPerSecond: 10,
      reconnectAfterMs: REALTIME_CONFIG.RECONNECTION_DELAY,
      maxReconnectionAttempts: REALTIME_CONFIG.MAX_RECONNECTION_ATTEMPTS
    }
  };
}
