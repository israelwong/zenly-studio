'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, User, MessageSquare } from 'lucide-react';
import { formatDateTime } from '@/lib/actions/utils/formatting';
import type { Prospect } from '@/lib/actions/schemas/prospects-schemas';

interface ProspectCardProps {
  prospect: Prospect;
  onClick?: () => void;
}

export function ProspectCard({ prospect, onClick }: ProspectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prospect.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatInterestedDates = (dates: string[] | null) => {
    if (!dates || dates.length === 0) return 'Fecha no definida';
    if (dates.length === 1) {
      return new Date(dates[0]).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    return `${dates.length} fechas`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 hover:border-zinc-600 cursor-pointer transition-colors"
    >
      <div className="space-y-3">
        <div>
          <h3 className="font-medium text-white text-sm">{prospect.name}</h3>
          {prospect.event_type && (
            <p className="text-xs text-zinc-400 mt-1">{prospect.event_type.name}</p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Calendar className="h-3 w-3" />
          <span>{formatInterestedDates(prospect.interested_dates)}</span>
        </div>

        {prospect.last_log && (
          <div className="flex items-start gap-2 text-xs text-zinc-500">
            <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <p className="line-clamp-2">{prospect.last_log.content}</p>
          </div>
        )}
      </div>
    </div>
  );
}

