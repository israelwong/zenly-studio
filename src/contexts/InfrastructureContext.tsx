'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

const HEALTH_CHECK_INTERVAL_MS = 60 * 1000; // 60s normal
const INCIDENCIA_POLL_INTERVAL_MS = 15 * 1000; // 15s en /incidencia-tecnica
const STABILITY_THRESHOLD = 3; // 3 éxitos consecutivos para pasar de down → stable
const CLIENT_TIMEOUT_MS = 3_500; // 3.5s (API falla a 3s, marcar down inmediatamente)

export type ConnectionStatus = 'stable' | 'degraded' | 'down' | 'checking';

/** Rutas de login/carga inicial: redirigir a incidencia cuando down */
const isLoginOrInitialPath = (path: string): boolean =>
    path === '/login' ||
    path === '/signup' ||
    path === '/sign-up' ||
    path === '/signin' ||
    path === '/' ||
    path === '/incidencia-tecnica' ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/update-password');

/** Solo guardar callbackUrl para rutas de negocio. Nunca /login ni /incidencia-tecnica */
const isWorkRoute = (path: string): boolean =>
    (path.startsWith('/admin') ||
        path.startsWith('/agente') ||
        /^\/[a-zA-Z0-9-]+\/studio/.test(path)) &&
    path !== '/login' &&
    !path.startsWith('/incidencia-tecnica');

interface InfrastructureContextType {
    connectionStatus: ConnectionStatus;
    triggerHealthCheck: () => Promise<void>;
    lastCheckedAt: number;
    pollInterval: number;
    successCount: number; // 0-3: éxitos consecutivos para pasar de down → stable
}

const InfrastructureContext = createContext<InfrastructureContextType>({
    connectionStatus: 'stable',
    triggerHealthCheck: async () => {},
    lastCheckedAt: 0,
    pollInterval: HEALTH_CHECK_INTERVAL_MS,
    successCount: 0,
});

export function InfrastructureProvider({ children }: { children: React.ReactNode }) {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
    const [lastCheckedAt, setLastCheckedAt] = useState(0);
    const [successCount, setSuccessCount] = useState(0);
    const pathname = usePathname();
    const router = useRouter();

    const consecutiveFailures = useRef(0);
    const consecutiveSuccesses = useRef(0);
    const isStableRef = useRef(true);

    useEffect(() => {
        isStableRef.current = connectionStatus === 'stable';
    }, [connectionStatus]);

    const checkHealth = useCallback(async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
            const res = await fetch('/api/health', { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json();
                if (data?.status === 'ok') {
                    consecutiveFailures.current = 0;
                    if (isStableRef.current) {
                        consecutiveSuccesses.current = STABILITY_THRESHOLD;
                        setSuccessCount(STABILITY_THRESHOLD);
                        return;
                    }
                    consecutiveSuccesses.current += 1;
                    setSuccessCount(consecutiveSuccesses.current);
                    if (consecutiveSuccesses.current >= STABILITY_THRESHOLD) {
                        setConnectionStatus('stable');
                    }
                } else {
                    consecutiveSuccesses.current = 0;
                    setSuccessCount(0);
                    consecutiveFailures.current += 1;
                    setConnectionStatus(consecutiveFailures.current >= 2 ? 'down' : 'degraded');
                }
            } else {
                consecutiveSuccesses.current = 0;
                setSuccessCount(0);
                consecutiveFailures.current += 1;
                setConnectionStatus(consecutiveFailures.current >= 2 ? 'down' : 'degraded');
            }
        } catch {
            consecutiveSuccesses.current = 0;
            setSuccessCount(0);
            consecutiveFailures.current += 1;
            setConnectionStatus(consecutiveFailures.current >= 2 ? 'down' : 'degraded');
        } finally {
            setLastCheckedAt(Date.now());
        }
    }, []);

    const pollInterval =
        pathname === '/incidencia-tecnica' ? INCIDENCIA_POLL_INTERVAL_MS : HEALTH_CHECK_INTERVAL_MS;

    useEffect(() => {
        checkHealth();
        const id = setInterval(checkHealth, pollInterval);
        return () => clearInterval(id);
    }, [checkHealth, pollInterval]);

    // Redirección forzada: en login/carga inicial + down → /incidencia-tecnica
    // Solo guardar callbackUrl si es ruta de trabajo (evitar login/incidencia como callback)
    useEffect(() => {
        if (connectionStatus === 'down' && isLoginOrInitialPath(pathname)) {
            const url = isWorkRoute(pathname)
                ? `/incidencia-tecnica?callbackUrl=${encodeURIComponent(pathname)}`
                : '/incidencia-tecnica';
            router.replace(url);
        }
    }, [connectionStatus, pathname, router]);

    return (
        <InfrastructureContext.Provider
            value={{
                connectionStatus,
                triggerHealthCheck: checkHealth,
                lastCheckedAt,
                pollInterval,
                successCount,
            }}
        >
            {children}
        </InfrastructureContext.Provider>
    );
}

export const useInfrastructure = () => useContext(InfrastructureContext);
