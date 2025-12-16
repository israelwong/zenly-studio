import {
    Text,
    Button,
    Section,
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { BRANDING } from '@/config/branding';

interface AgentCredentialsEmailProps {
    agentName: string;
    email: string;
    temporaryPassword: string;
    loginUrl: string;
    isNewAgent?: boolean;
    platformData?: {
        nombre: string;
        logotipo: string;
        isotipo: string;
        sitio_web?: string;
        soporte_email?: string;
    };
}

export function AgentCredentialsEmail({
    agentName,
    email,
    temporaryPassword,
    loginUrl,
    isNewAgent = false,
    platformData
}: AgentCredentialsEmailProps) {
    const platformName = platformData?.nombre || BRANDING.fullName;
    
    const previewText = isNewAgent
        ? `Bienvenido a ${platformName}, ${agentName}`
        : `Nuevas credenciales para tu cuenta de ${platformName}`;

    return (
        <EmailLayout
            title={`Credenciales de Acceso - ${platformName}`}
            previewText={previewText}
            platformData={platformData}
        >
            <Text style={heading}>
                {isNewAgent ? `¡Bienvenido a ${platformName}!` : 'Credenciales Actualizadas'}
            </Text>

            <Text style={paragraph}>
                Hola <strong>{agentName}</strong>,
            </Text>

            <Text style={paragraph}>
                {isNewAgent
                    ? `Te damos la bienvenida al equipo de ${platformName}. Aquí están tus credenciales de acceso:`
                    : 'Tus credenciales de acceso han sido actualizadas. Aquí están tus nuevos datos de acceso:'
                }
            </Text>

            {/* Credenciales */}
            <Section style={credentialsBox}>
                <Text style={credentialsTitle}>
                    📧 <strong>Credenciales de Acceso</strong>
                </Text>

                <Text style={credentialItem}>
                    <strong>Email:</strong><br />
                    <Text style={credentialValue}>{email}</Text>
                </Text>

                <Text style={credentialItem}>
                    <strong>Contraseña Temporal:</strong><br />
                    <Text style={credentialValue}>{temporaryPassword}</Text>
                </Text>

                <Text style={credentialItem}>
                    <strong>URL de Acceso:</strong><br />
                    <Text style={credentialValue}>{loginUrl}</Text>
                </Text>
            </Section>

            {/* Botón de Acceso */}
            <Section style={buttonContainer}>
                <Button href={loginUrl} style={button}>
                    Acceder a mi Panel
                </Button>
            </Section>

            {/* Instrucciones */}
            <Section style={warningBox}>
                <Text style={warningTitle}>
                    ⚠️ <strong>Importante:</strong>
                </Text>
                <Text style={warningText}>
                    • Esta contraseña es <strong>temporal</strong> y debe ser cambiada en tu primer inicio de sesión
                </Text>
                <Text style={warningText}>
                    • Guarda estas credenciales en un lugar seguro
                </Text>
                <Text style={warningText}>
                    • No compartas esta información por canales no seguros
                </Text>
                <Text style={warningText}>
                    • Si tienes problemas para acceder, contacta al administrador del sistema
                </Text>
            </Section>

            <Text style={paragraph}>
                Si necesitas ayuda o tienes alguna pregunta, no dudes en contactarnos.
            </Text>

            <Text style={signature}>
                Saludos,<br />
                <strong>Equipo {platformName}</strong>
            </Text>
        </EmailLayout>
    );
}

// Estilos
const heading = {
    fontSize: '24px',
    lineHeight: '1.3',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: '0 0 20px',
};

const paragraph = {
    fontSize: '16px',
    lineHeight: '1.4',
    color: '#484848',
    margin: '0 0 16px',
};

const credentialsBox = {
    backgroundColor: '#f8f9fa',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    padding: '24px',
    margin: '24px 0',
};

const credentialsTitle = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: '0 0 16px',
    textAlign: 'center' as const,
};

const credentialItem = {
    fontSize: '14px',
    color: '#484848',
    margin: '0 0 16px',
};

const credentialValue = {
    backgroundColor: '#ffffff',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '14px',
    fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    display: 'block',
    margin: '4px 0 0',
};

const buttonContainer = {
    textAlign: 'center' as const,
    margin: '32px 0',
};

const button = {
    backgroundColor: '#3b82f6',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 32px',
    border: 'none',
};

const warningBox = {
    backgroundColor: '#fef3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '6px',
    padding: '16px',
    margin: '24px 0',
};

const warningTitle = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#856404',
    margin: '0 0 8px',
};

const warningText = {
    fontSize: '13px',
    color: '#856404',
    margin: '0 0 4px',
    lineHeight: '1.4',
};

const signature = {
    fontSize: '16px',
    color: '#484848',
    margin: '32px 0 0',
};
