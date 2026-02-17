import { CrewMemberSelector } from '@/components/shared/crew-members/CrewMemberSelector';
import { asignarCrewAItem } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

interface SchedulerPersonalCellProps {
    item: NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items'][0];
    studioSlug: string;
}

export function SchedulerPersonalCell({ item, studioSlug }: SchedulerPersonalCellProps) {
    const handleCrewChange = async (memberId: string | null) => {
        const result = await asignarCrewAItem(
            studioSlug,
            item.id,
            memberId
        );
        if (result.success) {
            if (result.googleSyncFailed) {
                toast.warning('Personal asignado localmente, pero falló la actualización en Google Calendar. Intenta publicar nuevamente para sincronizar invitados.');
            }
            toast.success('Personal asignado correctamente');
        } else {
            toast.error(result.error || 'Error al asignar personal');
        }
    };

    return (
        <div className="w-full min-w-[180px]">
            <CrewMemberSelector
                studioSlug={studioSlug}
                selectedMemberId={item.assigned_to_crew_member_id || null}
                onSelect={handleCrewChange}
                placeholder="Asignar personal"
                className="w-full"
            />
        </div>
    );
}
