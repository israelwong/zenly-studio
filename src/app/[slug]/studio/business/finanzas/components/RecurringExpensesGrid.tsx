'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { Plus, Calendar, DollarSign } from 'lucide-react';

interface RecurringExpense {
    id: string;
    name: string;
    amount: number;
    category: string;
    chargeDay: number;
    isActive: boolean;
}

interface RecurringExpensesGridProps {
    expenses: RecurringExpense[];
    onAddExpense: () => void;
    onEditExpense: (id: string) => void;
}

export function RecurringExpensesGrid({
    expenses,
    onAddExpense,
    onEditExpense,
}: RecurringExpensesGridProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-zinc-200">
                        Gastos Fijos Recurrentes
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                        Configura gastos que se generan automáticamente cada mes
                    </p>
                </div>
                <ZenButton variant="primary" onClick={onAddExpense}>
                    <Plus className="h-4 w-4" />
                    Agregar Gasto
                </ZenButton>
            </div>

            {expenses.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-800 rounded-lg">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                    <p className="text-zinc-400 mb-2">No hay gastos fijos configurados</p>
                    <p className="text-sm text-zinc-500">
                        Agrega gastos recurrentes como suscripciones, renta o servicios
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {expenses.map((expense) => (
                        <ZenCard
                            key={expense.id}
                            variant="default"
                            padding="md"
                            className="hover:border-zinc-700 transition-colors cursor-pointer"
                            onClick={() => onEditExpense(expense.id)}
                        >
                            <ZenCardContent className="p-0">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h4 className="text-base font-semibold text-zinc-200 mb-1">
                                            {expense.name}
                                        </h4>
                                        <p className="text-sm text-zinc-400">{expense.category}</p>
                                    </div>
                                    {!expense.isActive && (
                                        <span className="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded">
                                            Inactivo
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                                    <div className="flex items-center gap-2 text-zinc-300">
                                        <DollarSign className="h-4 w-4 text-zinc-400" />
                                        <span className="text-lg font-bold">
                                            {formatCurrency(expense.amount)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        <Calendar className="h-4 w-4" />
                                        <span className="text-sm">Día {expense.chargeDay}</span>
                                    </div>
                                </div>
                            </ZenCardContent>
                        </ZenCard>
                    ))}
                </div>
            )}
        </div>
    );
}
