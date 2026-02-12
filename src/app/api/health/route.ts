import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const HEALTH_TIMEOUT_MS = 3000;

/**
 * Health check minimalista: SELECT 1 contra Supabase.
 * Si tarda >5s o devuelve error → Servicio Caído.
 */
export async function GET() {
    try {
        const result = await Promise.race([
            prisma.$queryRaw`SELECT 1 as ok`,
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Health check timeout')), HEALTH_TIMEOUT_MS)
            ),
        ]);
        const ok = Array.isArray(result) && result[0] && (result[0] as { ok?: number })?.ok === 1;
        if (!ok) {
            return NextResponse.json({ status: 'down' }, { status: 500 });
        }
        return NextResponse.json({ status: 'ok' });
    } catch {
        return NextResponse.json({ status: 'down' }, { status: 500 });
    }
}
