import { User } from 'lucide-react';
import { ZenAvatar, ZenAvatarFallback, ZenBadge } from '@/components/ui/zen';
import { BADGE_STAGE_CLASSES, type TaskCategoryStage } from '../../utils/scheduler-section-stages';

interface SchedulerAgrupacionCellProps {
    servicio: string;
    isCompleted?: boolean;
    isSubtask?: boolean;
    assignedCrewMember?: {
        id: string;
        name: string;
        tipo?: string;
        category?: {
            id: string;
            name: string;
        } | null;
    } | null;
    duration?: number; // Duración en días
    /** Si true, no se muestra el badge (se renderiza en rightSlot del sidebar) */
    hideBadge?: boolean;
    /** Stage para color del badge (alineado con powerbar) */
    stageCategory?: TaskCategoryStage;
}

export function SchedulerAgrupacionCell({ servicio, isCompleted = false, isSubtask = false, assignedCrewMember, duration, hideBadge = false, stageCategory }: SchedulerAgrupacionCellProps) {
    const hasAssigned = !!assignedCrewMember;

    // Generar iniciales del nombre
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Determinar color del avatar según categoría o tipo
    const getAvatarColor = () => {
        if (!hasAssigned || !assignedCrewMember) return 'bg-zinc-700/50 text-zinc-500';

        const categoryName = assignedCrewMember.category?.name;
        const tipo = assignedCrewMember.tipo;

        // Si hay categoría y es Fotógrafo, usar emerald
        if (categoryName === 'Fotógrafo') {
            return 'bg-emerald-600/20 text-emerald-400 text-[10px]';
        }

        // Si hay tipo y es fotógrafo (variaciones), usar emerald
        if (tipo?.toLowerCase().includes('fotógrafo') || tipo?.toLowerCase().includes('fotografo')) {
            return 'bg-emerald-600/20 text-emerald-400 text-[10px]';
        }

        // Por defecto, azul
        return 'bg-blue-600/20 text-blue-400 text-[10px]';
    };

    return (
        <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Avatar */}
            <ZenAvatar className="h-7 w-7 shrink-0">
                {hasAssigned && assignedCrewMember ? (
                    <ZenAvatarFallback className={isCompleted ? "bg-emerald-600/20 text-emerald-400 text-[10px]" : getAvatarColor()}>
                        {getInitials(assignedCrewMember.name)}
                    </ZenAvatarFallback>
                ) : (
                    <ZenAvatarFallback className="bg-zinc-700/50 text-zinc-500 text-xs">
                        <User className="h-3.5 w-3.5" />
                    </ZenAvatarFallback>
                )}
            </ZenAvatar>

            {/* Nombre del servicio */}
            <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
                <p className={`text-sm leading-tight line-clamp-2 cursor-pointer transition-colors ${isCompleted
                    ? 'font-normal italic text-zinc-500 line-through decoration-2 decoration-zinc-500 hover:text-zinc-400'
                    : isSubtask
                    ? 'font-normal text-zinc-300 hover:text-zinc-200'
                    : 'font-medium text-zinc-300 hover:text-zinc-200'
                    }`}>
                    {servicio}
                </p>
            </div>

            {/* Badge duración (mismo estilo que ManualTaskRow) */}
            {!hideBadge && duration != null && duration > 0 && (
                <ZenBadge
                    variant="secondary"
                    className={`shrink-0 ml-auto font-mono text-[10px] px-1.5 py-0 h-5 min-w-[1.75rem] justify-center ${stageCategory ? BADGE_STAGE_CLASSES[stageCategory] : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50'}`}
                >
                    {duration}d
                </ZenBadge>
            )}
        </div>
    );
}
