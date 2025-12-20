'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { ZenInput } from '@/components/ui/zen';
import { Label } from '@/components/ui/shadcn/label';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/shadcn/dialog';
import {
    Plus,
    Edit,
    Trash2,
    DollarSign,
    Calendar,
    Repeat,
    AlertCircle,
    CheckCircle,
    Clock,
    CreditCard,
    Building,
    Wifi,
    Car,
    FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { FinancialAnalytics } from '../../types';

interface ExpensesManagerProps {
    data: FinancialAnalytics['expenses'];
    onExpenseUpdate: (expenses: FinancialAnalytics['expenses']) => void;
    loading?: boolean;
}

export function ExpensesManager({
    data,
    onExpenseUpdate,
    loading = false
}: ExpensesManagerProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<FinancialAnalytics['expenses'][0] | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        category: '',
        recurrence: 'monthly' as 'monthly' | 'biweekly' | 'one-time',
        description: ''
    });

    // Categorías de gastos con iconos
    const expenseCategories = [
        { value: 'infrastructure', label: 'Infraestructura', icon: Building, color: 'bg-blue-100 text-blue-800' },
        { value: 'marketing', label: 'Marketing', icon: CreditCard, color: 'bg-green-100 text-green-800' },
        { value: 'software', label: 'Software', icon: Wifi, color: 'bg-purple-100 text-purple-800' },
        { value: 'travel', label: 'Viajes', icon: Car, color: 'bg-orange-100 text-orange-800' },
        { value: 'office', label: 'Oficina', icon: FileText, color: 'bg-gray-100 text-gray-800' },
        { value: 'other', label: 'Otros', icon: DollarSign, color: 'bg-red-100 text-red-800' }
    ];

    const getCategoryInfo = (category: string) => {
        return expenseCategories.find(cat => cat.value === category) || expenseCategories[5];
    };

    const getRecurrenceInfo = (recurrence: string) => {
        switch (recurrence) {
            case 'monthly':
                return { label: 'Mensual', icon: Calendar, color: 'bg-blue-100 text-blue-800' };
            case 'biweekly':
                return { label: 'Quincenal', icon: Repeat, color: 'bg-green-100 text-green-800' };
            case 'one-time':
                return { label: 'Una vez', icon: CheckCircle, color: 'bg-gray-100 text-gray-800' };
            default:
                return { label: 'Mensual', icon: Calendar, color: 'bg-blue-100 text-blue-800' };
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.amount || !formData.category) {
            toast.error('Por favor, completa todos los campos requeridos');
            return;
        }

        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('El monto debe ser un número válido mayor a 0');
            return;
        }

        const newExpense = {
            id: editingExpense?.id || `expense-${Date.now()}`,
            name: formData.name,
            amount: amount,
            category: formData.category,
            recurrence: formData.recurrence,
            description: formData.description,
            nextDue: formData.recurrence !== 'one-time' ? new Date() : undefined
        };

        if (editingExpense) {
            // Actualizar gasto existente
            const updatedExpenses = data.map(expense =>
                expense.id === editingExpense.id ? newExpense : expense
            );
            onExpenseUpdate(updatedExpenses);
            toast.success('Gasto actualizado exitosamente');
        } else {
            // Agregar nuevo gasto
            onExpenseUpdate([...data, newExpense]);
            toast.success('Gasto agregado exitosamente');
        }

        // Limpiar formulario
        setFormData({
            name: '',
            amount: '',
            category: '',
            recurrence: 'monthly',
            description: ''
        });
        setEditingExpense(null);
        setIsDialogOpen(false);
    };

    const handleEdit = (expense: FinancialAnalytics['expenses'][0]) => {
        setEditingExpense(expense);
        setFormData({
            name: expense.name,
            amount: expense.amount.toString(),
            category: expense.category,
            recurrence: expense.recurrence,
            description: expense.description || ''
        });
        setIsDialogOpen(true);
    };

    const handleDelete = (expenseId: string) => {
        const confirmed = confirm('¿Estás seguro de que quieres eliminar este gasto?');
        if (confirmed) {
            const updatedExpenses = data.filter(expense => expense.id !== expenseId);
            onExpenseUpdate(updatedExpenses);
            toast.success('Gasto eliminado exitosamente');
        }
    };

    const handleAddNew = () => {
        setEditingExpense(null);
        setFormData({
            name: '',
            amount: '',
            category: '',
            recurrence: 'monthly',
            description: ''
        });
        setIsDialogOpen(true);
    };

    // Calcular totales por categoría
    const categoryTotals = expenseCategories.map(category => {
        const total = data
            .filter(expense => expense.category === category.value)
            .reduce((sum, expense) => sum + expense.amount, 0);
        return { ...category, total };
    }).filter(cat => cat.total > 0);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Gestión de Gastos
                    </CardTitle>
                    <CardDescription>
                        Administra y categoriza los gastos de la empresa
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-pulse text-muted-foreground">Cargando datos...</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Gestión de Gastos
                </CardTitle>
                <CardDescription>
                    Administra y categoriza los gastos de la empresa
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Resumen por categorías */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Gastos por Categoría</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categoryTotals.map((category) => {
                                const IconComponent = category.icon;
                                return (
                                    <div key={category.value} className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <IconComponent className="h-5 w-5 text-gray-600" />
                                            <div>
                                                <div className="font-medium">{category.label}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {data.filter(e => e.category === category.value).length} gastos
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-red-600">
                                                ${category.total.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Lista de gastos */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Lista de Gastos</h4>
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={handleAddNew} size="sm">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Agregar Gasto
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle>
                                            {editingExpense ? 'Editar Gasto' : 'Agregar Nuevo Gasto'}
                                        </DialogTitle>
                                        <DialogDescription>
                                            {editingExpense ? 'Modifica los datos del gasto' : 'Agrega un nuevo gasto al sistema'}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <ZenInput
                                            id="name"
                                            label="Nombre del Gasto"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ej: Licencia de Supabase"
                                        />

                                        <ZenInput
                                            id="amount"
                                            label="Monto (MXN)"
                                            required
                                            type="number"
                                            step="0.01"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            placeholder="0.00"
                                        />
                                        <div className="space-y-2">
                                            <Label htmlFor="category">Categoría *</Label>
                                            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona una categoría" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {expenseCategories.map((category) => {
                                                        const IconComponent = category.icon;
                                                        return (
                                                            <SelectItem key={category.value} value={category.value}>
                                                                <div className="flex items-center gap-2">
                                                                    <IconComponent className="h-4 w-4" />
                                                                    {category.label}
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="recurrence">Recurrencia *</Label>
                                            <Select value={formData.recurrence} onValueChange={(value: 'monthly' | 'biweekly' | 'one-time') => setFormData({ ...formData, recurrence: value })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona la recurrencia" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="monthly">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4" />
                                                            Mensual
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="biweekly">
                                                        <div className="flex items-center gap-2">
                                                            <Repeat className="h-4 w-4" />
                                                            Quincenal
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="one-time">
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle className="h-4 w-4" />
                                                            Una vez
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="description">Descripción</Label>
                                            <Textarea
                                                id="description"
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="Descripción opcional del gasto"
                                                rows={3}
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                                Cancelar
                                            </Button>
                                            <Button type="submit">
                                                {editingExpense ? 'Actualizar' : 'Agregar'} Gasto
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="space-y-3">
                            {data.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No hay gastos registrados</p>
                                    <p className="text-sm">Agrega tu primer gasto para comenzar</p>
                                </div>
                            ) : (
                                data.map((expense) => {
                                    const categoryInfo = getCategoryInfo(expense.category);
                                    const recurrenceInfo = getRecurrenceInfo(expense.recurrence);
                                    const IconComponent = categoryInfo.icon;
                                    const RecurrenceIcon = recurrenceInfo.icon;

                                    return (
                                        <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-zinc-800">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-gray-100 rounded-lg">
                                                    <IconComponent className="h-5 w-5 text-gray-600" />
                                                </div>
                                                <div>
                                                    <div className="font-medium">{expense.name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {expense.description || 'Sin descripción'}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className={categoryInfo.color}>
                                                            {categoryInfo.label}
                                                        </Badge>
                                                        <Badge variant="outline" className={recurrenceInfo.color}>
                                                            <RecurrenceIcon className="h-3 w-3 mr-1" />
                                                            {recurrenceInfo.label}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <div className="font-bold text-red-600">
                                                        ${expense.amount.toLocaleString()}
                                                    </div>
                                                    {expense.nextDue && (
                                                        <div className="text-xs text-muted-foreground">
                                                            Próximo: {expense.nextDue.toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(expense)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(expense.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Acciones rápidas */}
                    <div className="pt-4 border-t">
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                Exportar Reporte
                            </Button>
                            <Button variant="outline" size="sm">
                                Configurar Alertas
                            </Button>
                            <Button variant="outline" size="sm">
                                Análisis de Gastos
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
