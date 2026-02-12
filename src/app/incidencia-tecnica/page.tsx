'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { ServerCog, ExternalLink, RefreshCw, CheckCircle } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { useInfrastructure } from '@/contexts/InfrastructureContext';

const RESTORE_REDIRECT_DELAY_MS = 2000;
const STABILITY_THRESHOLD = 3;
const RETRY_COOLDOWN_MS = 10_000; // 10s throttle en botón Reintentar

/**
 * Página de incidencia técnica - Zenly Style, auto-restauración con umbral de 3 niveles
 */
export default function IncidenciaTecnicaPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { triggerHealthCheck, successCount, lastCheckedAt, pollInterval } = useInfrastructure();
    const [isRetrying, setIsRetrying] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const [secondsUntilNext, setSecondsUntilNext] = useState(0);
    const cooldownEndRef = useRef(0);

    const rawCallback = searchParams.get('callbackUrl');
    const callbackUrl = rawCallback?.startsWith('/') && !rawCallback.startsWith('//')
        ? rawCallback
        : null;

    const isRecovered = successCount >= STABILITY_THRESHOLD;
    const isValidating = successCount > 0 && successCount < STABILITY_THRESHOLD;

    // Auto-restauración: solo cuando successCount === 3 → redirigir a login con callbackUrl
    useEffect(() => {
        if (isRecovered) {
            const target = callbackUrl
                ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
                : '/login';
            const t = setTimeout(() => router.push(target), RESTORE_REDIRECT_DELAY_MS);
            return () => clearTimeout(t);
        }
    }, [isRecovered, callbackUrl, router]);

    // Contador regresivo: próximo poll automático (15s)
    useEffect(() => {
        const update = () => {
            const base = lastCheckedAt || Date.now();
            const elapsed = Date.now() - base;
            setSecondsUntilNext(Math.max(0, Math.ceil((pollInterval - elapsed) / 1000)));
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [lastCheckedAt, pollInterval]);

    // Cooldown de 10s: botón deshabilitado + spinner durante 10s
    useEffect(() => {
        if (cooldownRemaining <= 0) return;
        const id = setInterval(() => {
            const left = Math.max(0, Math.ceil((cooldownEndRef.current - Date.now()) / 1000));
            setCooldownRemaining(left);
            if (left <= 0) setIsRetrying(false);
        }, 1000);
        return () => clearInterval(id);
    }, [cooldownRemaining]);

    async function handleRetry() {
        if (isRetrying || cooldownRemaining > 0) return;
        if (isRecovered) {
            const target = callbackUrl
                ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
                : '/login';
            router.push(target);
            return;
        }
        setIsRetrying(true);
        cooldownEndRef.current = Date.now() + RETRY_COOLDOWN_MS;
        setCooldownRemaining(Math.ceil(RETRY_COOLDOWN_MS / 1000));
        triggerHealthCheck().catch(() => {
            // Sin alertas: el mensaje de mantenimiento permanece inalterado
        });
    }

    // Estados del botón: Éxito > Cooldown > Validación > Reposo
    const getButtonState = () => {
        if (isRecovered) return { label: '¡Conexión recuperada! Entrando...', disabled: true, loading: false };
        if (cooldownRemaining > 0) return { label: `Espera ${cooldownRemaining}s`, disabled: true, loading: true };
        if (isValidating) return { label: `Validando estabilidad... ${successCount}/${STABILITY_THRESHOLD}`, disabled: true, loading: true };
        return { label: 'Reintentar ahora', disabled: false, loading: false };
    };
    const btnState = getButtonState();
    const showAutoRetryMessage = btnState.label === 'Reintentar ahora';

    return (
        <div className="min-h-svh w-full flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Icono con animación y resplandor ámbar */}
                <div className="flex justify-center">
                    <div className="rounded-full bg-amber-950/40 border border-amber-800/50 p-6 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                        <ServerCog
                            className="h-16 w-16 text-amber-500"
                            aria-hidden
                        />
                    </div>
                </div>

                {/* Contenido */}
                <div className="space-y-4">
                    <h1 className="text-2xl font-bold text-zinc-100">
                        Servidor en mantenimiento
                    </h1>
                    <p className="text-zinc-400 text-base leading-relaxed">
                        Nuestro proveedor de infraestructura (Supabase) está
                        experimentando problemas en la región. Estamos
                        monitoreando la situación y trabajaremos para
                        restablecer el servicio lo antes posible.
                    </p>
                </div>

                {/* Indicador de estabilidad: 3 puntos animados (pulso secuencial, dot por dot) */}
                <div className="flex items-center justify-center gap-2" aria-hidden>
                    {[1, 2, 3].map((i) => (
                        <span
                            key={i}
                            className={`inline-block w-2.5 h-2.5 rounded-full ${
                                i <= successCount
                                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-300'
                                    : 'bg-zinc-600 animate-pulse'
                            }`}
                            style={
                                i > successCount
                                    ? { animationDelay: `${(i - 1) * 233}ms` }
                                    : undefined
                            }
                        />
                    ))}
                </div>

                {/* Botón principal: toda la narrativa en el label */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <ZenButton
                        onClick={handleRetry}
                        variant="primary"
                        className={`gap-2 w-full sm:flex-1 sm:min-w-[180px] h-11 shrink-0 ${
                            isRecovered ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                        }`}
                        disabled={btnState.disabled}
                        loading={btnState.loading}
                        loadingText={btnState.label}
                    >
                        {isRecovered ? (
                            <CheckCircle className="h-4 w-4" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        {btnState.label}
                    </ZenButton>
                    <a
                        href="https://status.supabase.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800/50 hover:text-white transition-colors w-full sm:flex-1 sm:min-w-[180px] text-sm font-medium ${
                            isRecovered ? 'pointer-events-none opacity-60' : ''
                        }`}
                    >
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        Ver estado oficial
                    </a>
                </div>

                <p className="text-zinc-500 text-sm">
                    Tu información está segura. Por favor, intenta de nuevo
                    en unos minutos.
                </p>

                {/* Mensaje inferior: solo en reposo, evita redundancia con Cooldown/Validación */}
                <p
                    className={`text-zinc-600 text-xs font-light text-center transition-opacity duration-300 ${
                        showAutoRetryMessage ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                >
                    Reintentando establecer conexión en {secondsUntilNext} segundos...
                </p>
            </div>
        </div>
    );
}
