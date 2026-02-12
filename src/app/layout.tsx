import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { InfrastructureProvider } from '@/contexts/InfrastructureContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Zenly Studio',
    description: 'Plataforma modular para estudios fotográficos',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body className={inter.className}>
                <AuthProvider>
                    <InfrastructureProvider>
                        {children}
                    </InfrastructureProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
