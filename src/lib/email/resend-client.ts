import { Resend } from 'resend';
import { BRANDING, EMAILS } from '@/config/branding';

if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not defined in environment variables');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Configuración de emails
export const EMAIL_CONFIG = {
    from: process.env.RESEND_FROM_EMAIL || `${BRANDING.emailFrom} <${EMAILS.noreply}>`,
    replyTo: process.env.RESEND_REPLY_TO || EMAILS.hello,
} as const;

// Tipos para emails
export interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
}

// Función helper para enviar emails
export async function sendEmail(options: EmailOptions) {
    try {
        console.log('📧 Enviando email con configuración:', {
            from: EMAIL_CONFIG.from,
            to: options.to,
            subject: options.subject,
            hasHtml: !!options.html,
            hasText: !!options.text,
            replyTo: options.replyTo || EMAIL_CONFIG.replyTo,
        });

        const result = await resend.emails.send({
            from: EMAIL_CONFIG.from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
            replyTo: options.replyTo || EMAIL_CONFIG.replyTo,
        });

        console.log('📧 Resultado completo de Resend:', JSON.stringify(result, null, 2));
        console.log('✅ Email sent successfully:', result.data?.id);

        return { success: true, id: result.data?.id };
    } catch (error) {
        console.error('❌ Error sending email:', error);
        return { success: false, error };
    }
}
