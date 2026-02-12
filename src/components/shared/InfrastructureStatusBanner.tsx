'use client';

import { StatusBanner } from './StatusBanner';

/**
 * Banner Caso B: sesión activa. El poll corre en InfrastructureProvider (60s).
 */
export function InfrastructureStatusBanner() {
    return <StatusBanner />;
}
