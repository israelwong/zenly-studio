import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { determinePromiseState } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { getPromisePathFromState } from '@/lib/utils/promise-navigation';
import { obtenerMetodosPagoManuales } from '@/lib/actions/studio/config/metodos-pago.actions';
import { getReminderByPromise } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { obtenerAgendamientoPorPromise } from '@/lib/actions/shared/agenda-unified.actions';
import { CierrePageInner } from './components/CierrePageInner';

interface PromiseCierrePageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

/** Métodos de pago del estudio para el card de confirmación; cache por studio para respuesta instantánea */
function getCachedMetodosPago(studioSlug: string) {
  return unstable_cache(
    async () => {
      const result = await obtenerMetodosPagoManuales(studioSlug);
      if (!result.success || !result.data) return [];
      return result.data.map((m) => ({ id: m.id, payment_method_name: m.payment_method_name }));
    },
    [`metodos-pago-${studioSlug}`],
    { tags: [`metodos-pago-${studioSlug}`], revalidate: 60 }
  )();
}

/**
 * Cadenero: permite cierre y autorizada para que el overlay de éxito no sea interrumpido por redirect.
 * Solo redirige si el estado no es ni cierre ni autorizada (ej. pendiente).
 */
export default async function PromiseCierrePage({ params }: PromiseCierrePageProps) {
  const { slug: studioSlug, promiseId } = await params;

  const stateResult = await determinePromiseState(promiseId);

  if (stateResult.success && stateResult.data) {
    const state = stateResult.data.state;
    const allowedStates = ['cierre', 'autorizada'];
    if (!allowedStates.includes(state)) {
      redirect(getPromisePathFromState(studioSlug, promiseId, state));
    }
  }

  const [metodosPago, agendamientoResult, reminderResult] = await Promise.all([
    getCachedMetodosPago(studioSlug),
    obtenerAgendamientoPorPromise(studioSlug, promiseId).catch((err) => {
      console.warn('[PromiseCierrePage] obtenerAgendamientoPorPromise error:', err?.message ?? err);
      return { success: true as const, data: undefined };
    }),
    getReminderByPromise(studioSlug, promiseId).catch((err) => {
      console.warn('[PromiseCierrePage] getReminderByPromise error:', err?.message ?? err);
      return { success: true as const, data: null };
    }),
  ]);

  const initialAgendamiento = agendamientoResult.success && agendamientoResult.data ? agendamientoResult.data : null;
  const initialReminder = reminderResult.success && reminderResult.data != null ? reminderResult.data : null;

  return (
    <CierrePageInner
      initialMetodosPago={metodosPago}
      initialAgendamiento={initialAgendamiento}
      initialReminder={initialReminder}
    />
  );
}
