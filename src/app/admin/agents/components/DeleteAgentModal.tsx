"use client";

import React, { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/shadcn/alert-dialog';
import { Badge } from '@/components/ui/shadcn/badge';
import { AlertTriangle, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Agent } from '../types';

interface DeleteAgentModalProps {
    agent: Agent | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function DeleteAgentModal({ agent, isOpen, onClose, onSuccess }: DeleteAgentModalProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    if (!agent) return null;

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/admin/agents/${agent.id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al eliminar el agente');
            }

            const result = await response.json();

            toast.success('Agente eliminado exitosamente');

            // Mostrar información sobre leads reasignados
            if (result.leadsReassigned > 0) {
                toast.info(`${result.leadsReassigned} leads fueron liberados para reasignación`);
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error deleting agent:', error);
            toast.error(error instanceof Error ? error.message : 'Error al eliminar el agente');
        } finally {
            setIsDeleting(false);
        }
    };

    const hasLeads = agent._count.prosocial_leads > 0;

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Eliminar Agente
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                        ¿Estás seguro de que deseas eliminar al agente{' '}
                        <strong>{agent.nombre}</strong>?
                    </AlertDialogDescription>

                    <div className="space-y-3 mt-4">
                        {hasLeads && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="h-4 w-4 text-yellow-600" />
                                    <span className="font-medium text-yellow-800">
                                        Leads Asociados
                                    </span>
                                    <Badge variant="outline" className="text-yellow-700">
                                        {agent._count.prosocial_leads} leads
                                    </Badge>
                                </div>
                                <p className="text-sm text-yellow-700">
                                    Los <strong>{agent._count.prosocial_leads} leads</strong> actualmente
                                    asignados a este agente serán <strong>liberados</strong> y
                                    quedarán disponibles para reasignación a otros agentes.
                                </p>
                                <p className="text-sm text-yellow-700 mt-2">
                                    Se agregará una entrada en la bitácora de cada lead
                                    indicando el cambio.
                                </p>
                            </div>
                        )}

                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">
                                <strong>Esta acción no se puede deshacer.</strong> El agente
                                será eliminado del sistema de autenticación y de la base de datos.
                            </p>
                        </div>
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Eliminando...
                            </>
                        ) : (
                            'Eliminar Agente'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
