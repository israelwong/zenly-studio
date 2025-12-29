'use server';

import { prisma } from '@/lib/prisma';
import { obtenerCredencialesGoogle } from '@/lib/actions/platform/integrations/google.actions';
import { encryptToken } from '@/lib/utils/encryption';
import { crearGrupoContactosZEN } from '@/lib/integrations/google/clients/contacts.client';
import { obtenerOCrearCalendarioSecundario } from '@/lib/integrations/google/clients/calendar/calendar-manager';

export interface GoogleOAuthUrlResult {
    success: boolean;
    url?: string;
    error?: string;
}

export type GoogleResource = 'drive' | 'calendar' | 'contacts';

const RESOURCE_SCOPES: Record<GoogleResource, string[]> = {
    drive: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file',
    ],
    calendar: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
    ],
    contacts: ['https://www.googleapis.com/auth/contacts'],
};

/**
 * Genera URL de OAuth2 unificada para conectar múltiples recursos de Google
 * @param studioSlug - Slug del estudio
 * @param recursos - Array de recursos a conectar: 'drive', 'calendar', 'contacts'
 * @param returnUrl - URL de retorno opcional
 * @param context - Contexto opcional ('personel', 'contacts', etc.)
 */
export async function obtenerUrlConexionUnificada(
    studioSlug: string,
    recursos: GoogleResource[],
    returnUrl?: string,
    context?: string
): Promise<GoogleOAuthUrlResult> {
    try {
        if (!recursos || recursos.length === 0) {
            return { success: false, error: 'Debes seleccionar al menos un recurso' };
        }

        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true, studio_name: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const credentialsResult = await obtenerCredencialesGoogle();
        if (!credentialsResult.success || !credentialsResult.data) {
            return {
                success: false,
                error: credentialsResult.error || 'Credenciales de Google no configuradas',
            };
        }

        const { clientId, redirectUri } = credentialsResult.data;

        // Combinar scopes de todos los recursos seleccionados
        const scopes: string[] = [];
        recursos.forEach((recurso) => {
            const recursoScopes = RESOURCE_SCOPES[recurso];
            recursoScopes.forEach((scope) => {
                if (!scopes.includes(scope)) {
                    scopes.push(scope);
                }
            });
        });

        // Agregar scope de userinfo para obtener email y nombre del usuario
        // Esto es necesario para mostrar qué cuenta de Google está conectada
        const userInfoScopes = [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ];
        userInfoScopes.forEach((scope) => {
            if (!scopes.includes(scope)) {
                scopes.push(scope);
            }
        });

        if (scopes.length === 0) {
            return { success: false, error: 'No se pudieron generar scopes válidos' };
        }

        // State contiene el studioSlug, returnUrl, recursos y context
        const state = Buffer.from(
            JSON.stringify({
                studioSlug,
                returnUrl: returnUrl || null,
                recursos, // Array de recursos seleccionados
                context: context || null,
                unified: true, // Flag para identificar flujo unificado
            })
        ).toString('base64');

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scopes.join(' '),
            access_type: 'offline',
            prompt: 'consent', // Forzar consent para obtener refresh_token
            state,
        })}`;

        return { success: true, url: authUrl };
    } catch (error) {
        console.error('[obtenerUrlConexionUnificada] Error:', error);
        return {
            success: false,
            error: 'Error al generar URL de OAuth',
        };
    }
}

/**
 * Procesa el callback de OAuth2 unificado para múltiples recursos
 * Crea estructuras necesarias para cada recurso (carpeta Drive, calendario secundario, grupo de contactos)
 */
export async function procesarCallbackUnificado(
    code: string,
    state: string
): Promise<{
    success: boolean;
    studioSlug?: string;
    returnUrl?: string;
    error?: string;
}> {
    try {
        // Decodificar state
        let stateData: {
            studioSlug?: string;
            returnUrl?: string | null;
            recursos?: GoogleResource[];
            context?: string | null;
            unified?: boolean;
        };
        try {
            stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        } catch {
            return { success: false, error: 'State inválido' };
        }

        const studioSlug = stateData.studioSlug;
        const returnUrl = stateData.returnUrl || null;
        const recursos = stateData.recursos || [];
        const context = stateData.context || null;

        if (!studioSlug) {
            return { success: false, error: 'Studio slug no encontrado en state' };
        }

        if (recursos.length === 0) {
            return { success: false, error: 'No se especificaron recursos a conectar' };
        }

        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: {
                id: true,
                studio_name: true,
                google_oauth_scopes: true,
                google_integrations_config: true,
            },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const credentialsResult = await obtenerCredencialesGoogle();
        if (!credentialsResult.success || !credentialsResult.data) {
            return {
                success: false,
                error: credentialsResult.error || 'Credenciales de Google no configuradas',
            };
        }

        const { clientId, clientSecret, redirectUri } = credentialsResult.data;

        // Intercambiar code por tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('[procesarCallbackUnificado] Error intercambiando code:', errorData);
            return {
                success: false,
                error: 'Error al intercambiar código por tokens',
            };
        }

        const tokens = await tokenResponse.json();

        if (!tokens.refresh_token) {
            console.error('[procesarCallbackUnificado] ERROR: No se recibió refresh_token');
            return {
                success: false,
                error:
                    'No se recibió refresh_token. Asegúrate de incluir prompt=consent en la URL de OAuth.',
            };
        }

        // Obtener información del usuario usando el header Authorization (más seguro)
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        });

        let email: string | undefined;
        let name: string | null = null;

        if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            email = userInfo.email;
            name = userInfo.name || null;
        } else {
            const errorData = await userInfoResponse.json().catch(() => ({}));
            console.error('[procesarCallbackUnificado] ❌ Error obteniendo información del usuario:', {
                status: userInfoResponse.status,
                statusText: userInfoResponse.statusText,
                error: errorData,
            });
            // No fallar la conexión si no podemos obtener el email, pero loguear el error
        }

        // Parsear scopes recibidos
        let scopes: string[] = [];
        if (tokens.scope) {
            scopes = tokens.scope.split(' ');
        } else {
            // Si no vienen, construir desde los recursos solicitados
            recursos.forEach((recurso) => {
                RESOURCE_SCOPES[recurso].forEach((scope) => {
                    if (!scopes.includes(scope)) {
                        scopes.push(scope);
                    }
                });
            });
        }

        // Combinar con scopes existentes (autorización incremental)
        let scopesFinales = scopes;
        if (studio.google_oauth_scopes) {
            try {
                const scopesExistentes = JSON.parse(
                    studio.google_oauth_scopes
                ) as string[];
                scopesFinales = Array.from(new Set([...scopesExistentes, ...scopes]));
            } catch {
                scopesFinales = scopes;
            }
        }

        // Determinar qué recursos están habilitados
        const hasDriveScope =
            scopesFinales.some((s) => s.includes('drive.readonly')) ||
            scopesFinales.some((s) => s.includes('drive'));
        const hasCalendarScope =
            scopesFinales.some((s) => s.includes('calendar')) ||
            scopesFinales.some((s) => s.includes('calendar.events'));
        const hasContactsScope = scopesFinales.some((s) => s.includes('contacts'));

        // Encriptar refresh token
        const encryptedRefreshToken = await encryptToken(tokens.refresh_token);

        // Obtener configuración existente
        let integrationsConfig: any = {};
        if (studio.google_integrations_config) {
            try {
                integrationsConfig =
                    typeof studio.google_integrations_config === 'string'
                        ? JSON.parse(studio.google_integrations_config)
                        : studio.google_integrations_config;
            } catch {
                integrationsConfig = {};
            }
        }

        // Procesar cada recurso secuencialmente
        // 1. Drive: No creamos carpeta automáticamente (se crea cuando se necesita)
        if (hasDriveScope && recursos.includes('drive')) {
            integrationsConfig.drive = { enabled: true };
        }

        // 2. Calendar: Crear calendario secundario si no existe
        if (hasCalendarScope && recursos.includes('calendar')) {
            try {
                // Guardar tokens primero para que obtenerOCrearCalendarioSecundario pueda usarlos
                await prisma.studios.update({
                    where: { slug: studioSlug },
                    data: {
                        google_oauth_refresh_token: encryptedRefreshToken,
                        google_oauth_email: email,
                        google_oauth_name: name,
                        google_oauth_scopes: JSON.stringify(scopesFinales),
                        is_google_connected: true,
                        google_integrations_config: {
                            ...integrationsConfig,
                            calendar: { enabled: true },
                        },
                    },
                });

                // Crear calendario secundario
                await obtenerOCrearCalendarioSecundario(studioSlug);
                integrationsConfig.calendar = { enabled: true };
            } catch (error) {
                console.error(
                    '[procesarCallbackUnificado] Error creando calendario secundario:',
                    error
                );
                // No fallar la conexión si falla la creación del calendario
            }
        }

        // 3. Contacts: Crear grupo de contactos
        let groupResourceName: string | null = null;
        let contactsError: string | null = null;
        if (hasContactsScope && recursos.includes('contacts')) {
            try {
                // Crear cliente directamente con tokens recibidos
                const { createGoogleContactsClientWithTokens } = await import(
                    '@/lib/integrations/google/clients/contacts.client'
                );
                const peopleClient = await createGoogleContactsClientWithTokens(
                    tokens.refresh_token,
                    tokens.access_token
                );

                // Crear grupo usando el cliente ya inicializado
                const grupoResult = await crearGrupoContactosZEN(
                    studioSlug,
                    studio.studio_name,
                    peopleClient
                );
                groupResourceName = grupoResult.resourceName;
                integrationsConfig.contacts = {
                    enabled: true,
                    groupResourceName,
                    lastSyncAt: null,
                };
            } catch (error: any) {
                console.error(
                    '[procesarCallbackUnificado] Error creando grupo de contactos:',
                    error
                );
                
                // Detectar errores críticos (API no habilitada, permisos, etc.)
                const isCriticalError = 
                    error?.code === 403 || 
                    error?.status === 403 ||
                    error?.message?.includes('has not been used') ||
                    error?.message?.includes('is disabled') ||
                    error?.message?.includes('Enable it by visiting');

                if (isCriticalError) {
                    // Error crítico: no marcar como habilitado
                    // Extraer URL de habilitación si está en el mensaje
                    const enableUrlMatch = error?.message?.match(/https:\/\/[^\s]+/);
                    const enableUrl = enableUrlMatch ? enableUrlMatch[0] : null;
                    
                    if (enableUrl) {
                        contactsError = `Google Contacts no pudo conectarse: La People API no está habilitada en tu proyecto de Google Cloud. Habilítala aquí: ${enableUrl}`;
                    } else {
                        contactsError = 'Google Contacts no pudo conectarse: La People API no está habilitada en tu proyecto de Google Cloud. Ve a Google Cloud Console y habilita la People API.';
                    }
                    console.error('[procesarCallbackUnificado] ❌ Error crítico en Contacts, no se marcará como habilitado');
                } else {
                    // Error no crítico: marcar como habilitado pero sin grupo
                    integrationsConfig.contacts = {
                        enabled: true,
                        groupResourceName: null,
                        lastSyncAt: null,
                    };
                }
            }
        }

        // Actualizar configuración final
        const updateData: any = {
            google_oauth_email: email,
            google_oauth_name: name,
            google_oauth_scopes: JSON.stringify(scopesFinales),
            is_google_connected: true,
            google_integrations_config: integrationsConfig,
        };

        // Solo actualizar refresh_token si tenemos uno nuevo
        if (encryptedRefreshToken) {
            updateData.google_oauth_refresh_token = encryptedRefreshToken;
        }

        // Guardar tokens y configuración final
        await prisma.studios.update({
            where: { slug: studioSlug },
            data: updateData,
        });

        const recursosConectados = recursos.filter((r) => {
            if (r === 'contacts' && contactsError) return false;
            return true;
        });

        // Si hay error crítico en Contacts, incluir mensaje en el resultado
        if (contactsError) {
            console.error(`[procesarCallbackUnificado] ⚠️ Contacts no pudo conectarse: ${contactsError}`);
            return { 
                success: true, 
                studioSlug, 
                returnUrl: returnUrl || undefined,
                error: `Google Contacts no pudo conectarse: ${contactsError}. Los demás servicios se conectaron correctamente.`
            };
        }

        return { success: true, studioSlug, returnUrl: returnUrl || undefined };
    } catch (error) {
        console.error('[procesarCallbackUnificado] Error:', error);
        return {
            success: false,
            error: 'Error al procesar callback de OAuth',
        };
    }
}

