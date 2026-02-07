'use server';

import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/utils/encryption';
import type { GoogleOAuthCredentials } from '@/types/google-drive';

export interface GoogleCredentialsResult {
  success: boolean;
  data?: GoogleOAuthCredentials & { apiKey?: string };
  error?: string;
}

const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';

/**
 * Redirect URI dinámica según entorno para evitar redirect_uri_mismatch.
 * - development: http://localhost:3000/api/auth/google/callback
 * - production: https://www.zenly.mx/api/auth/google/callback (o GOOGLE_REDIRECT_URI si está definida)
 */
export async function getGoogleOAuthRedirectUri(): Promise<string> {
  if (process.env.NODE_ENV === 'development') {
    return `http://localhost:${process.env.PORT ?? '3000'}${GOOGLE_CALLBACK_PATH}`;
  }
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `https://www.zenly.mx${GOOGLE_CALLBACK_PATH}`
  );
}

/**
 * Obtiene credenciales OAuth de Google desde platform_config
 * Si no están en DB, usa variables de entorno como fallback.
 * redirect_uri se resuelve siempre de forma dinámica según NODE_ENV para coincidir con la URL que recibe Google.
 */
export async function obtenerCredencialesGoogle(): Promise<GoogleCredentialsResult> {
  try {
    const redirectUri = await getGoogleOAuthRedirectUri();

    // Intentar obtener desde platform_config
    const platformConfig = await prisma.platform_config.findFirst({
      select: {
        google_oauth_client_id: true,
        google_oauth_client_secret: true,
        google_oauth_redirect_uri: true,
        google_drive_api_key: true,
      },
    });

    if (
      platformConfig?.google_oauth_client_id &&
      platformConfig?.google_oauth_client_secret
    ) {
      // Desencriptar client_secret si está encriptado
      let clientSecret = platformConfig.google_oauth_client_secret;
      try {
        clientSecret = await decryptToken(clientSecret);
      } catch {
        clientSecret = platformConfig.google_oauth_client_secret;
      }

      return {
        success: true,
        data: {
          clientId: platformConfig.google_oauth_client_id,
          clientSecret,
          redirectUri,
          apiKey: platformConfig.google_drive_api_key || undefined,
        },
      };
    }

    // Fallback a variables de entorno
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    if (!clientId || !clientSecret) {
      return {
        success: false,
        error: 'Credenciales de Google OAuth no configuradas. Configure en platform_config o variables de entorno.',
      };
    }

    return {
      success: true,
      data: {
        clientId,
        clientSecret,
        redirectUri,
        apiKey: apiKey || undefined,
      },
    };
  } catch (error) {
    console.error('[obtenerCredencialesGoogle] Error:', error);
    return {
      success: false,
      error: 'Error al obtener credenciales de Google',
    };
  }
}

