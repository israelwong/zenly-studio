import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Img,
    Text,
    Link,
    Hr,
} from '@react-email/components';
import * as React from 'react';
import { BRANDING, EMAILS } from '@/config/branding';

interface EmailLayoutProps {
    children: React.ReactNode;
    title?: string;
    previewText?: string;
    platformData?: {
        nombre: string;
        logotipo: string;
        isotipo: string;
        sitio_web?: string;
        soporte_email?: string;
    };
}

export function EmailLayout({ children, title, previewText, platformData }: EmailLayoutProps) {
    return (
        <Html>
            <Head>
                <title>{title || platformData?.nombre || BRANDING.fullName}</title>
                {previewText && (
                    <meta name="description" content={previewText} />
                )}
            </Head>
            <Body style={main}>
                <Container style={container}>
                    {/* Header con Logo */}
                    <Section style={header}>
                        <Img
                            src={platformData?.logotipo || 'https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/ProSocialPlatform/platform/logotipo.svg'}
                            width="160"
                            height="32"
                            alt={platformData?.nombre || BRANDING.fullName}
                            style={logo}
                        />
                    </Section>

                    {/* Contenido Principal */}
                    <Section style={content}>
                        {children}
                    </Section>

                    {/* Footer */}
                    <Section style={footer}>
                        <Hr style={hr} />
                        <Text style={footerText}>
                            {BRANDING.copyrightText}
                        </Text>
                        <Text style={footerText}>
                            <Link href={platformData?.sitio_web || BRANDING.websiteUrl} style={footerLink}>
                                {BRANDING.domain}
                            </Link>
                            {' • '}
                            <Link href={`mailto:${platformData?.soporte_email || EMAILS.support}`} style={footerLink}>
                                Soporte
                            </Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

// Estilos
const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    maxWidth: '600px',
};

const header = {
    padding: '32px 24px 24px',
    textAlign: 'center' as const,
    backgroundColor: '#f8f9fa', // Fondo claro para mejor contraste
    borderBottom: '1px solid #e9ecef',
};

const logo = {
    margin: '0 auto',
};

const content = {
    padding: '24px 24px 0',
};

const footer = {
    padding: '24px',
    textAlign: 'center' as const,
};

const hr = {
    borderColor: '#e6ebf1',
    margin: '20px 0',
};

const footerText = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    margin: '4px 0',
};

const footerLink = {
    color: '#556cd6',
    textDecoration: 'none',
};
