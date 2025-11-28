import { User } from 'lucide-react';
import { ZenAvatar, ZenAvatarFallback } from '@/components/ui/zen';

interface SchedulerAgrupacionCellProps {
    servicio: string;
    isCompleted?: boolean;
    assignedCrewMember?: {
        id: string;
        name: string;
        tipo?: string;
        category?: {
            id: string;
            name: string;
        } | null;
    } | null;
}

export function SchedulerAgrupacionCell({ servicio, isCompleted = false, assignedCrewMember }: SchedulerAgrupacionCellProps) {
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
        <div className="flex items-center gap-2 flex-1 min-w-0 pl-4">
            {/* Avatar */}
            <ZenAvatar className="h-7 w-7 flex-shrink-0">
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
            <p className={`text-sm break-words cursor-pointer transition-colors flex-1 min-w-0 ${
                isCompleted 
                    ? 'text-zinc-500 line-through decoration-zinc-600 hover:text-zinc-400' 
                    : 'text-zinc-300 hover:text-zinc-200'
            }`}>
                {servicio}
            </p>
        </div>
    );
}
