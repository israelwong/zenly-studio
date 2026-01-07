import { render } from '@react-email/components';
import { AgentCredentialsEmail } from '@/emails/templates/AgentCredentialsEmail';
import { sendEmail } from './resend-client';
import { prisma } from '@/lib/prisma';

export interface AgentCredentialsData {
    agentName: string;
    email: string;
    temporaryPassword: string;
    isNewAgent?: boolean;
}

/**
 * Envía email con credenciales a un agente
 */
export async function sendAgentCredentialsEmail(data: AgentCredentialsData) {
    try {
        // Obtener configuración de la plataforma
        const platformConfig = await prisma.platform_config.findFirst();

        // Generar URL de login - limpiar comillas extra
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://prosocial-platform.vercel.app').replace(/['"]/g, '');
        const loginUrl = `${baseUrl}/login`;

        // Datos dinámicos de la plataforma
        const platformData = {
            nombre: platformConfig?.commercial_name || platformConfig?.company_name || 'Zenly Studio',
            logotipo: platformConfig?.logo_url || null,
            isotipo: platformConfig?.favicon_url || null,
            sitio_web: platformConfig?.domain ? `https://${platformConfig.domain}` : 'https://www.zenn.mx',
            soporte_email: platformConfig?.soporte_email || 'soporte@zenn.mx',
        };

        // Renderizar el template de React a HTML
        let emailHtml;
        try {
            emailHtml = await render(
                AgentCredentialsEmail({
                    agentName: data.agentName,
                    email: data.email,
                    temporaryPassword: data.temporaryPassword,
                    loginUrl,
                    isNewAgent: data.isNewAgent || false,
                    platformData,
                })
            );
            console.log('📧 HTML generado:', {
                type: typeof emailHtml,
                length: emailHtml?.length,
                preview: emailHtml?.substring(0, 200) + '...'
            });
        } catch (renderError) {
            console.error('❌ Error renderizando email:', renderError);
            // Fallback a HTML simple
            emailHtml = generateSimpleHtml(data, loginUrl, platformData);
        }

        // Enviar el email
        const result = await sendEmail({
            to: data.email,
            subject: data.isNewAgent
                ? `🎉 Bienvenido a ${platformData.nombre} - Credenciales de Acceso`
                : `🔑 Credenciales Actualizadas - ${platformData.nombre}`,
            html: emailHtml,
            text: generatePlainTextVersion(data, loginUrl, platformData),
        });

        if (result.success) {
            console.log(`✅ Credenciales enviadas a ${data.email} (ID: ${result.id})`);
            return { success: true, emailId: result.id };
        } else {
            console.error(`❌ Error enviando credenciales a ${data.email}:`, result.error);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('❌ Error en sendAgentCredentialsEmail:', error);
        return { success: false, error };
    }
}

/**
 * Genera HTML simple como fallback
 */
function generateSimpleHtml(data: AgentCredentialsData, loginUrl: string, platformData: { nombre: string; logotipo: string; isotipo: string; sitio_web?: string; soporte_email?: string }): string {
    const welcomeText = data.isNewAgent
        ? `¡Bienvenido a ${platformData.nombre}!`
        : 'Credenciales Actualizadas';

    const introText = data.isNewAgent
        ? `Te damos la bienvenida al equipo de ${platformData.nombre}. Aquí están tus credenciales de acceso:`
        : 'Tus credenciales de acceso han sido actualizadas. Aquí están tus nuevos datos de acceso:';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${welcomeText} - ${platformData.nombre}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1a1a1a;">${platformData.nombre}</h1>
    </div>
    
    <h2 style="color: #1a1a1a;">${welcomeText}</h2>
    
    <p>Hola <strong>${data.agentName}</strong>,</p>
    
    <p>${introText}</p>
    
    <div style="background-color: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 24px; margin: 24px 0;">
        <h3 style="text-align: center; margin-top: 0;">📧 Credenciales de Acceso</h3>
        
        <p><strong>Email:</strong><br>
        <span style="background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 4px; padding: 8px 12px; display: inline-block; font-family: monospace;">${data.email}</span></p>
        
        <p><strong>Contraseña Temporal:</strong><br>
        <span style="background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 4px; padding: 8px 12px; display: inline-block; font-family: monospace;">${data.temporaryPassword}</span></p>
        
        <p><strong>URL de Acceso:</strong><br>
        <a href="${loginUrl}" style="color: #3b82f6; text-decoration: none;">${loginUrl}</a></p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Acceder a mi Panel</a>
    </div>
    
    <div style="background-color: #fef3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 16px; margin: 24px 0;">
        <h4 style="color: #856404; margin-top: 0;">⚠️ Importante:</h4>
        <ul style="color: #856404; margin: 0; padding-left: 20px;">
            <li>Esta contraseña es <strong>temporal</strong> y debe ser cambiada en tu primer inicio de sesión</li>
            <li>Guarda estas credenciales en un lugar seguro</li>
            <li>No compartas esta información por canales no seguros</li>
            <li>Si tienes problemas para acceder, contacta al administrador del sistema</li>
        </ul>
    </div>
    
    <p>Si necesitas ayuda o tienes alguna pregunta, no dudes en contactarnos.</p>
    
    <p>Saludos,<br>
    <strong>Equipo ${platformData.nombre}</strong></p>
    
    <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">
    <p style="text-align: center; color: #8898aa; font-size: 12px;">
        © 2024 ${platformData.nombre}. Todos los derechos reservados.<br>
        <a href="${platformData.sitio_web || 'https://www.zenn.mx'}" style="color: #556cd6;">Sitio Web</a> • 
        <a href="mailto:${platformData.soporte_email || 'soporte@zenn.mx'}" style="color: #556cd6;">Soporte</a>
    </p>
</body>
</html>`.trim();
}

/**
 * Genera versión en texto plano del email
 */
function generatePlainTextVersion(data: AgentCredentialsData, loginUrl: string, platformData: { nombre: string; logotipo: string; isotipo: string; sitio_web?: string; soporte_email?: string }): string {
    const welcomeText = data.isNewAgent
        ? `¡Bienvenido a ${platformData.nombre}!`
        : 'Credenciales Actualizadas';

    const introText = data.isNewAgent
        ? `Te damos la bienvenida al equipo de ${platformData.nombre}. Aquí están tus credenciales de acceso:`
        : 'Tus credenciales de acceso han sido actualizadas. Aquí están tus nuevos datos de acceso:';

    return `
${welcomeText}

Hola ${data.agentName},

${introText}

CREDENCIALES DE ACCESO:
Email: ${data.email}
Contraseña Temporal: ${data.temporaryPassword}
URL de Acceso: ${loginUrl}

IMPORTANTE:
• Esta contraseña es temporal y debe ser cambiada en tu primer inicio de sesión
• Guarda estas credenciales en un lugar seguro
• No compartas esta información por canales no seguros
• Si tienes problemas para acceder, contacta al administrador del sistema

Si necesitas ayuda o tienes alguna pregunta, no dudes en contactarnos.

Saludos,
Equipo ${platformData.nombre}

© 2024 ${platformData.nombre}. Todos los derechos reservados.
Sitio Web: ${platformData.sitio_web || 'https://www.zenn.mx'}
Soporte: ${platformData.soporte_email || 'soporte@zenn.mx'}
`.trim();
}

/**
 * Validar configuración de email
 */
export function validateEmailConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!process.env.RESEND_API_KEY) {
        errors.push('RESEND_API_KEY no está configurada');
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
        errors.push('NEXT_PUBLIC_APP_URL no está configurada');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}
