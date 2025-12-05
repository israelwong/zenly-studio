import { prisma } from '@/lib/prisma';
import type { ContentType, AnalyticsEventType } from '@/lib/actions/studio/analytics/analytics.actions';

interface AnalyticsEvent {
    studio_id: string;
    content_type: ContentType;
    content_id: string;
    event_type: AnalyticsEventType;
    user_id?: string;
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
    referrer?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    metadata?: Record<string, unknown>;
    created_at?: Date;
}

/**
 * AnalyticsQueue - Sistema de cola para batch writes
 * Agrupa eventos y los guarda en lotes para optimizar performance
 */
class AnalyticsQueue {
    private queue: AnalyticsEvent[] = [];
    private timer: NodeJS.Timeout | null = null;
    private isProcessing = false;

    // Configuración
    private readonly BATCH_SIZE = 50; // Enviar cada 50 eventos
    private readonly FLUSH_INTERVAL = 5000; // O cada 5 segundos
    private readonly MAX_QUEUE_SIZE = 500; // Límite de seguridad

    /**
     * Agregar evento a la cola
     */
    add(event: AnalyticsEvent) {
        // Protección contra queue overflow
        if (this.queue.length >= this.MAX_QUEUE_SIZE) {
            console.warn('[AnalyticsQueue] Queue full, dropping event');
            return;
        }

        this.queue.push({
            ...event,
            created_at: event.created_at || new Date()
        });

        // Flush si alcanzamos el tamaño del batch
        if (this.queue.length >= this.BATCH_SIZE) {
            this.flush();
        } else {
            // O programar flush después del intervalo
            this.scheduleFlush();
        }
    }

    /**
     * Programar flush automático
     */
    private scheduleFlush() {
        if (this.timer) return;

        this.timer = setTimeout(() => {
            this.flush();
        }, this.FLUSH_INTERVAL);
    }

    /**
     * Enviar eventos a la base de datos
     */
    private async flush() {
        if (this.queue.length === 0 || this.isProcessing) return;

        this.isProcessing = true;
        const eventsToSend = [...this.queue];
        this.queue = [];

        // Limpiar timer
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        try {
            // Batch insert - mucho más eficiente que inserts individuales
            await prisma.studio_content_analytics.createMany({
                data: eventsToSend.map(e => ({
                    studio_id: e.studio_id,
                    content_type: e.content_type,
                    content_id: e.content_id,
                    event_type: e.event_type,
                    user_id: e.user_id,
                    ip_address: e.ip_address,
                    user_agent: e.user_agent,
                    session_id: e.session_id,
                    referrer: e.referrer,
                    utm_source: e.utm_source,
                    utm_medium: e.utm_medium,
                    utm_campaign: e.utm_campaign,
                    utm_term: e.utm_term,
                    utm_content: e.utm_content,
                    metadata: e.metadata as any,
                    created_at: e.created_at
                })),
                skipDuplicates: true
            });

            console.log(`[AnalyticsQueue] Flushed ${eventsToSend.length} events`);
        } catch (error: any) {
            console.error('[AnalyticsQueue] Failed to flush events:', error);

            // Si es error de foreign key, NO re-encolar (datos inválidos)
            if (error?.code === 'P2003') {
                console.warn('[AnalyticsQueue] Foreign key constraint error - dropping invalid events');
                console.debug('[AnalyticsQueue] Invalid studio_ids:', 
                    [...new Set(eventsToSend.map(e => e.studio_id))].join(', ')
                );
            } 
            // Para otros errores, re-queue con límite
            else if (eventsToSend.length < 100) {
                console.log(`[AnalyticsQueue] Re-queuing ${eventsToSend.length} failed events`);
                this.queue.unshift(...eventsToSend);
            } else {
                console.warn('[AnalyticsQueue] Dropping failed batch (too large)');
            }
        } finally {
            this.isProcessing = false;

            // Si hay más eventos, programar siguiente flush
            if (this.queue.length > 0) {
                this.scheduleFlush();
            }
        }
    }

    /**
     * Forzar flush inmediato (útil para shutdown graceful)
     */
    async forceFlush() {
        await this.flush();
    }

    /**
     * Obtener tamaño actual de la cola (para debugging)
     */
    getQueueSize() {
        return this.queue.length;
    }
}

// Singleton global
export const analyticsQueue = new AnalyticsQueue();

// Flush automático antes de cerrar proceso (Node.js)
if (typeof process !== 'undefined') {
    process.on('beforeExit', async () => {
        await analyticsQueue.forceFlush();
    });
}
