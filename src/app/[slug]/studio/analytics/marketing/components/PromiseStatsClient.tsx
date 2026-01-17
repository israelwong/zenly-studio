'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, CheckCircle, XCircle, Clock, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ZenButton } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenCalendar } from '@/components/ui/zen/base/ZenCalendar';
import { ZenCard } from '@/components/ui/zen';
import { getPromiseStats } from '@/lib/actions/studio/analytics/promise-stats.actions';
import type { DateRange } from 'react-day-picker';
import type { PromiseStatsData } from '@/lib/actions/studio/analytics/promise-stats.actions';

interface PromiseStatsClientProps {
  studioId: string;
  initialData: PromiseStatsData;
}

export function PromiseStatsClient({ studioId, initialData }: PromiseStatsClientProps) {
  const [mounted, setMounted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { from: start, to: end };
  });
  const [tempRange, setTempRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(initialData);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getPromiseStats(studioId, {
          dateFrom: dateRange.from!,
          dateTo: dateRange.to!,
        });
        if (result.success && result.data) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateRange, studioId]);

  useEffect(() => {
    if (calendarOpen && currentMonth) {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      setTempRange({ from: start, to: end });
    }
  }, [currentMonth, calendarOpen]);

  const handleApplyRange = () => {
    if (tempRange?.from && tempRange?.to) {
      setDateRange(tempRange);
      setCalendarOpen(false);
    }
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return 'Seleccionar rango';
    if (!dateRange.to) {
      return format(dateRange.from, 'MMMM yyyy', { locale: es });
    }
    const fromFormatted = format(dateRange.from, 'd MMM', { locale: es });
    const toFormatted = format(dateRange.to, 'd MMM yyyy', { locale: es });
    return `${fromFormatted} - ${toFormatted}`;
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const statusCards = [
    {
      title: 'Pendientes',
      value: data.currentStatus.pending,
      icon: Clock,
      color: 'text-blue-400',
      bgColor: 'from-blue-500/10 to-blue-500/5',
      borderColor: 'border-blue-500/20',
    },
    {
      title: 'En Negociación',
      value: data.currentStatus.negotiation,
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'from-purple-500/10 to-purple-500/5',
      borderColor: 'border-purple-500/20',
    },
    {
      title: 'En Cierre',
      value: data.currentStatus.closing,
      icon: CheckCircle,
      color: 'text-amber-400',
      bgColor: 'from-amber-500/10 to-amber-500/5',
      borderColor: 'border-amber-500/20',
    },
    {
      title: 'Aprobadas',
      value: data.currentStatus.approved,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'from-emerald-500/10 to-emerald-500/5',
      borderColor: 'border-emerald-500/20',
    },
    {
      title: 'Archivadas',
      value: data.currentStatus.archived,
      icon: Archive,
      color: 'text-zinc-400',
      bgColor: 'from-zinc-500/10 to-zinc-500/5',
      borderColor: 'border-zinc-500/20',
    },
    {
      title: 'Canceladas',
      value: data.currentStatus.canceled,
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'from-red-500/10 to-red-500/5',
      borderColor: 'border-red-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white">
            Estadísticas de Promesas
          </h2>
        </div>
        {mounted ? (
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <ZenButton variant="ghost" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {formatDateRange()}
              </ZenButton>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="start">
              <div className="p-3">
                <ZenCalendar
                  mode="range"
                  defaultMonth={tempRange?.from || dateRange?.from}
                  selected={tempRange}
                  onSelect={setTempRange}
                  onMonthChange={setCurrentMonth}
                  numberOfMonths={2}
                  locale={es}
                />
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800 mt-3">
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTempRange(dateRange);
                      setCalendarOpen(false);
                    }}
                  >
                    Cancelar
                  </ZenButton>
                  <ZenButton
                    variant="default"
                    size="sm"
                    onClick={handleApplyRange}
                    disabled={!tempRange?.from || !tempRange?.to}
                  >
                    Aplicar
                  </ZenButton>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <ZenButton variant="ghost" size="sm" className="gap-2" disabled>
            <Calendar className="h-4 w-4" />
            {formatDateRange()}
          </ZenButton>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-zinc-400">Cargando estadísticas...</p>
        </div>
      ) : (
        <>
          {/* Status Actual */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-4">Status Actual</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {statusCards.map((card, index) => (
                <ZenCard key={index} className="p-4 hover:border-zinc-700 transition-colors group relative overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.bgColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg bg-gradient-to-br ${card.bgColor} border ${card.borderColor}`}>
                        <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
                      </div>
                      <p className="text-xs font-medium text-zinc-400">{card.title}</p>
                    </div>
                    <p className={`text-2xl font-bold ${card.color}`}>
                      {card.value.toLocaleString()}
                    </p>
                  </div>
                </ZenCard>
              ))}
            </div>
          </div>

          {/* Métricas del Período */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversiones */}
            <ZenCard className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">Conversiones</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                  <div>
                    <p className="text-xs font-medium text-zinc-400">Total Convertidas</p>
                    <p className="text-sm text-zinc-300 mt-0.5">En el período</p>
                  </div>
                  <p className="text-lg font-bold text-emerald-400">
                    {data.conversions.total.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
                  <div>
                    <p className="text-xs font-medium text-zinc-400">Valor Total</p>
                    <p className="text-sm text-zinc-300 mt-0.5">Monto convertido</p>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {formatCurrency(data.conversions.totalValue)}
                  </p>
                </div>
              </div>
            </ZenCard>

            {/* Canceladas */}
            <ZenCard className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-red-500/10">
                  <XCircle className="w-4 h-4 text-red-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">Canceladas</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/20">
                  <div>
                    <p className="text-xs font-medium text-zinc-400">Total Canceladas</p>
                    <p className="text-sm text-zinc-300 mt-0.5">En el período</p>
                  </div>
                  <p className="text-lg font-bold text-red-400">
                    {data.canceled.total.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
                  <div>
                    <p className="text-xs font-medium text-zinc-400">Promesas Creadas</p>
                    <p className="text-sm text-zinc-300 mt-0.5">En el período</p>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {data.created.total.toLocaleString()}
                  </p>
                </div>
              </div>
            </ZenCard>
          </div>

          {/* Cambios de Stage */}
          <ZenCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">Cambios de Stage</h3>
            </div>
            <div className="space-y-2">
              {data.stageChanges.byStage.slice(0, 5).map((stage, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30">
                  <span className="text-sm text-zinc-300">{stage.stageName}</span>
                  <span className="text-sm font-semibold text-white">{stage.count}</span>
                </div>
              ))}
            </div>
          </ZenCard>
        </>
      )}
    </div>
  );
}
