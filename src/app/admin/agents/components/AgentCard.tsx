"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/shadcn/dropdown-menu';
import {
    MoreHorizontal,
    Edit,
    Trash2,
    User,
    Phone,
    Mail,
    Key
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { DeleteAgentModal } from './DeleteAgentModal';
import { Agent } from '../types';

interface AuthStatus {
    exists: boolean;
    user?: {
        id: string;
        email: string;
        last_sign_in_at: string | null;
        is_active: boolean;
    };
    error?: string;
}

interface AgentCardProps {
    agent: Agent;
    onDelete?: (agentId: string) => void;
}

export function AgentCard({ agent, onDelete }: AgentCardProps) {
    const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [resendingCredentials, setResendingCredentials] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const fetchAuthStatus = useCallback(async () => {
        try {
            const response = await fetch(`/api/admin/agents/${agent.id}/auth-status`);
            const data = await response.json();
            setAuthStatus(data);
        } catch (error) {
            console.error('Error fetching auth status:', error);
        } finally {
            setLoadingAuth(false);
        }
    }, [agent.id]);

    useEffect(() => {
        fetchAuthStatus();
    }, [fetchAuthStatus]);

    const handleDelete = () => {
        setShowDeleteModal(true);
    };

    const handleDeleteSuccess = () => {
        if (onDelete) {
            onDelete(agent.id);
        }
    };

    const handleResendCredentials = async () => {
        setResendingCredentials(true);
        try {
            const response = await fetch(`/api/admin/agents/${agent.id}/resend-credentials`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Error al reenviar credenciales');
            }

            const data = await response.json();
            toast.success(`Credenciales enviadas a ${agent.email}`);

            // En desarrollo, mostrar las credenciales
            if (data.agent?.tempPassword) {
                toast.info(`Contraseña temporal: ${data.agent.tempPassword}`);
            }
        } catch (error) {
            console.error('Error resending credentials:', error);
            toast.error('Error al reenviar credenciales');
        } finally {
            setResendingCredentials(false);
        }
    };

    const getAuthStatusBadge = () => {
        if (loadingAuth) {
            return <Badge variant="secondary">Verificando...</Badge>;
        }

        if (!authStatus?.exists) {
            return <Badge variant="destructive">Sin acceso</Badge>;
        }

        if (!authStatus.user?.is_active) {
            return <Badge variant="destructive">Bloqueado</Badge>;
        }

        if (authStatus.user?.last_sign_in_at) {
            return <Badge variant="default">Con acceso</Badge>;
        }

        return <Badge variant="outline">Pendiente login</Badge>;
    };

    return (
        <div className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-white">{agent.nombre}</h3>
                        <Badge
                            variant="outline"
                            className={`text-xs ${agent.activo
                                ? 'border-green-500 text-green-400'
                                : 'border-red-500 text-red-400'
                                }`}
                        >
                            {agent.activo ? "Activo" : "Inactivo"}
                        </Badge>
                        {getAuthStatusBadge()}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                        <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {agent.email}
                        </div>
                        <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {agent.telefono}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <div className="text-right space-y-1">
                    <div className="text-sm font-medium text-white">
                        {agent._count.platform_leads} leads asignados
                    </div>
                    <div className="text-xs text-zinc-400">
                        Meta: {agent.metaMensualLeads}/mes
                    </div>
                    <div className="text-xs text-zinc-400">
                        Comisión: {(Number(agent.comisionConversion) * 100).toFixed(2)}%
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="!bg-zinc-950 !border-zinc-800 !text-white">
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/agents/${agent.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/agents/${agent.id}`}>
                                <User className="mr-2 h-4 w-4" />
                                Ver Detalles
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleResendCredentials}
                            disabled={resendingCredentials}
                        >
                            <Key className="mr-2 h-4 w-4" />
                            {resendingCredentials ? 'Enviando...' : 'Reenviar Credenciales'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={handleDelete}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <DeleteAgentModal
                agent={agent}
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onSuccess={handleDeleteSuccess}
            />
        </div>
    );
}
