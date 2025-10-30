'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Users, Building2, UserCheck, UserX, Briefcase } from 'lucide-react';
// import { PERSONNEL_PROFILE_LABELS } from '@/lib/actions/schemas/personal-schemas';
import type { PersonalStats } from '../types';

interface PersonalStatsProps {
    stats: PersonalStats;
    loading?: boolean;
}

export function PersonalStats({ stats, loading = false }: PersonalStatsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {[...Array(5)].map((_, i) => (
                    <Card key={i} className="bg-zinc-900 border-zinc-800 animate-pulse">
                        <CardContent className="p-6">
                            <div className="h-4 bg-zinc-700 rounded w-1/2 mb-2"></div>
                            <div className="h-8 bg-zinc-700 rounded w-1/3"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const mainStats = [
        {
            title: 'Total Personal',
            value: stats.totalPersonal,
            icon: Users,
            color: 'text-blue-400',
            bgColor: 'bg-blue-400/10',
        },
        {
            title: 'Empleados',
            value: stats.totalEmpleados,
            icon: UserCheck,
            color: 'text-green-400',
            bgColor: 'bg-green-400/10',
        },
        {
            title: 'Proveedores',
            value: stats.totalProveedores,
            icon: Building2,
            color: 'text-purple-400',
            bgColor: 'bg-purple-400/10',
        },
        {
            title: 'Activos',
            value: stats.totalActivos,
            icon: UserCheck,
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-400/10',
        },
        {
            title: 'Inactivos',
            value: stats.totalInactivos,
            icon: UserX,
            color: 'text-red-400',
            bgColor: 'bg-red-400/10',
        },
    ];

    return (
        <div className="space-y-6 mb-6">
            {/* Estadísticas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {mainStats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={index} className="bg-zinc-900 border-zinc-800">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-zinc-400">
                                            {stat.title}
                                        </p>
                                        <p className="text-2xl font-bold text-white">
                                            {stat.value}
                                        </p>
                                    </div>
                                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                        <Icon className={`h-5 w-5 ${stat.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Distribución por perfiles profesionales */}
            {/* {Object.keys(stats.perfilesProfesionales).length > 0 && (
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Briefcase className="h-5 w-5" />
                            Distribución por Perfiles Profesionales
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {Object.entries(stats.perfilesProfesionales)
                                .sort(([, a], [, b]) => b - a) // Ordenar por cantidad descendente
                                .map(([profile, count]) => (
                                    <div
                                        key={profile}
                                        className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">
                                                {profile}
                                            </p>
                                            <p className="text-xs text-zinc-400">
                                                {count === 1 ? '1 persona' : `${count} personas`}
                                            </p>
                                        </div>
                                        <div className="ml-2">
                                            <span className="inline-flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-blue-600 rounded-full">
                                                {count}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {Object.keys(stats.perfilesProfesionales).length === 0 && (
                            <div className="text-center text-zinc-400 py-8">
                                <Briefcase className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                                <p className="text-lg font-medium mb-2">No hay perfiles asignados</p>
                                <p className="text-sm">Los perfiles aparecerán aquí cuando agregues personal con especialidades</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )} */}
        </div>
    );
}
