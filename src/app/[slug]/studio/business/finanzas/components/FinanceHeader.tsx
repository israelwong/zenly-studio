'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import {
    ZenDropdownMenu,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
    ZenDropdownMenuTrigger,
} from '@/components/ui/zen';

interface FinanceHeaderProps {
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
    onRegistrarGasto: () => void;
    onRegistrarIngreso: () => void;
}

export function FinanceHeader({
    currentMonth,
    onMonthChange,
    onRegistrarGasto,
    onRegistrarIngreso,
}: FinanceHeaderProps) {
    const monthName = currentMonth.toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
    });

    const goToPreviousMonth = () => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() - 1);
        onMonthChange(newDate);
    };

    const goToNextMonth = () => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + 1);
        onMonthChange(newDate);
    };

    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousMonth}
                    aria-label="Mes anterior"
                >
                    <ChevronLeft className="h-4 w-4" />
                </ZenButton>
                <div className="px-4 py-2 min-w-[180px] text-center">
                    <span className="text-lg font-semibold text-zinc-200 capitalize">
                        {monthName}
                    </span>
                </div>
                <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={goToNextMonth}
                    aria-label="Mes siguiente"
                >
                    <ChevronRight className="h-4 w-4" />
                </ZenButton>
            </div>

            <ZenDropdownMenu>
                <ZenDropdownMenuTrigger asChild>
                    <ZenButton variant="primary">
                        <Plus className="h-4 w-4" />
                        Registrar
                    </ZenButton>
                </ZenDropdownMenuTrigger>
                <ZenDropdownMenuContent align="end">
                    <ZenDropdownMenuItem onClick={onRegistrarGasto}>
                        Registrar Gasto Extraordinario
                    </ZenDropdownMenuItem>
                    <ZenDropdownMenuItem onClick={onRegistrarIngreso}>
                        Registrar Ingreso Manual
                    </ZenDropdownMenuItem>
                </ZenDropdownMenuContent>
            </ZenDropdownMenu>
        </div>
    );
}
