/**
 * Barrel export para integraciones de studio
 * 
 * @deprecated Las funciones de Google se han movido a @/lib/integrations/google
 * Este archivo mantiene compatibilidad hacia atrás re-exportando desde la nueva ubicación
 */

// Re-exportar desde la nueva ubicación para mantener compatibilidad
export {
  obtenerEstadoConexion,
  desconectarGoogle,
  desconectarGoogleDrive,
  listarCarpetasDrive,
  listarSubcarpetas,
  obtenerContenidoCarpeta,
  obtenerDetallesCarpeta,
  obtenerAccessToken,
  type GoogleConnectionStatus,
  type GoogleFolderListResult,
  type GoogleFolderContentsResult,
  type AccessTokenResult,
} from '@/lib/integrations/google';

// @deprecated - Usar iniciarConexionGoogleDrive desde @/lib/integrations/google
export { iniciarConexionGoogleDrive as iniciarConexionGoogle } from '@/lib/integrations/google';

// @deprecated - Ya no se usa, migrado a callback unificado
export { procesarCallbackGoogleDrive as procesarCallbackGoogle } from '@/lib/integrations/google';

// @deprecated - Mantener tipo para compatibilidad
export type { GoogleOAuthUrlResult } from '@/lib/integrations/google';

