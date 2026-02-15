import { NextResponse } from 'next/server';
import { sincronizarTareasEvento } from '@/lib/actions/studio/business/events';

/**
 * Script temporal: re-sincroniza el scheduler de un evento.
 * POST /api/scripts/sync-event-scheduler
 * Body: { "studioSlug": "prosocial", "eventId": "cmkzv5qsn001hn0wwr51wwyy2" }
 * Solo en desarrollo o con header X-Script-Key.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development' && req.headers.get('X-Script-Key') !== process.env.SCRIPT_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { studioSlug, eventId } = body as { studioSlug?: string; eventId?: string };
    if (!studioSlug || !eventId) {
      return NextResponse.json(
        { error: 'Faltan studioSlug o eventId en el body' },
        { status: 400 }
      );
    }
    const result = await sincronizarTareasEvento(studioSlug, eventId);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[sync-event-scheduler]', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error al sincronizar' },
      { status: 500 }
    );
  }
}
