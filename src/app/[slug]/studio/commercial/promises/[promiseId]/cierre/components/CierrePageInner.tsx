'use client';

import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import type { Reminder } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { usePromiseContext } from '../../context/PromiseContext';
import { PromiseCierreClient } from './PromiseCierreClient';

/**
 * Contenido de la página cierre: usa datos del layout (context).
 * La guarda de servidor en page.tsx ya validó que la promesa está en cierre.
 * initialMetodosPago: inyectados desde el servidor (cache) para dropdown instantáneo.
 * initialReminder / initialAgendamiento: atomic seeding para que Recordatorio y Agendar cita pinten a la vez.
 */
export function CierrePageInner({
  initialMetodosPago = [],
  initialAgendamiento = null,
  initialReminder = null,
}: {
  initialMetodosPago?: Array<{ id: string; payment_method_name: string }>;
  initialAgendamiento?: AgendaItem | null;
  initialReminder?: Reminder | null;
}) {
  const { cotizacionEnCierre } = usePromiseContext();
  return (
    <PromiseCierreClient
      initialCotizacionEnCierre={cotizacionEnCierre ?? null}
      initialMetodosPago={initialMetodosPago}
      initialAgendamiento={initialAgendamiento}
      initialReminder={initialReminder}
    />
  );
}
