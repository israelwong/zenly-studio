'use client';

import React from 'react';
import Link from 'next/link';
import { ZenCard, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { Calendar, User, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NominaFijaItem {
    id: string;
    name: string;
    amount: number;
    frequency?: string;
    description?: string | null;
    crewMemberId?: string;
}

interface NominaFijaItemCardProps {
    item: NominaFijaItem;
    studioSlug: string;
}

function getFrequencyLabel(frequency?: string): string {
    switch (frequency) {
        case 'monthly':
            return 'Mensual';
        case 'biweekly':
            return 'Quincenal';
        case 'weekly':
            return 'Semanal';
        default:
            return 'Mensual';
    }
}

export function NominaFijaItemCard({ item, studioSlug }: NominaFijaItemCardProps) {
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

    const editHref = item.crewMemberId
        ? `/${studioSlug}/studio/business/personel?edit=${item.crewMemberId}`
        : null;

    return (
        <ZenCard
            variant="default"
            padding="sm"
            className={cn(
                'border-emerald-500/20 hover:border-emerald-700/40 transition-colors',
                !editHref && 'opacity-90'
            )}
        >
            <ZenCardContent className="p-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <User className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                            <p className="text-sm font-medium text-zinc-200 truncate">{item.name}</p>
                        </div>
                        {item.description && (
                            <p className="text-xs text-zinc-500 mb-1 truncate">{item.description}</p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                            <p className="text-base text-rose-400 font-semibold">
                                {formatCurrency(item.amount)}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-zinc-500">
                                <Calendar className="h-3 w-3" />
                                <span>{getFrequencyLabel(item.frequency)}</span>
                            </div>
                        </div>
                    </div>
                    {editHref ? (
                        <Link href={editHref} className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <ZenButton
                                variant="outline"
                                size="sm"
                                type="button"
                                className="h-7 gap-1.5 text-xs text-zinc-300 hover:text-emerald-400 hover:border-emerald-700/50"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Editar en Personal
                            </ZenButton>
                        </Link>
                    ) : null}
                </div>
            </ZenCardContent>
        </ZenCard>
    );
}
