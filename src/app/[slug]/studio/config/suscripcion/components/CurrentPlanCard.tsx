"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  CheckCircle,
  XCircle,
  Calendar,
  CreditCard,
  Clock,
} from 'lucide-react';
import { SuscripcionData } from '@/lib/actions/studio/account/suscripcion/types';
import { createCustomerPortal } from '@/lib/actions/studio/account/suscripcion/stripe-billing.actions';
import { ZenButton } from '@/components/ui/zen';
import { toast } from 'sonner';
import { PlansComparisonModal } from '@/components/shared/subscription/PlansComparisonModal';
import { CancelSubscriptionModal } from '@/components/shared/subscription/CancelSubscriptionModal';

interface CurrentPlanCardProps {
  data: SuscripcionData;
  studioSlug: string;
}

export function CurrentPlanCard({ data, studioSlug }: CurrentPlanCardProps) {
  const { subscription, plan, limits } = data;
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const getTrialDaysRemaining = () => {
    if (subscription.status !== 'TRIAL' || !subscription.current_period_end) {
      return null;
    }
    const endDate = new Date(subscription.current_period_end);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const trialDaysRemaining = getTrialDaysRemaining();

  const handleOpenPlansModal = () => {
    setShowPlansModal(true);
  };

  const handleCancelSubscription = async () => {
    setLoadingCancel(true);
    try {
      const returnBaseUrl = typeof window !== "undefined" ? window.location.origin : undefined;
      const result = await createCustomerPortal(studioSlug, returnBaseUrl);
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.error || 'Error al abrir portal de facturación');
        setLoadingCancel(false);
      }
    } catch (error) {
      toast.error('Error al abrir portal de facturación');
      setLoadingCancel(false);
    }
  };

  const getPlanColor = (planSlug: string) => {
    switch (planSlug) {
      case 'free': return 'bg-green-900/30 text-green-300 border-green-800';
      case 'pro': return 'bg-blue-900/30 text-blue-300 border-blue-800';
      case 'enterprise': return 'bg-purple-900/30 text-purple-300 border-purple-800';
      default: return 'bg-zinc-900/30 text-zinc-300 border-zinc-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-900/30 text-green-300 border-green-800';
      case 'TRIAL': return 'bg-yellow-900/30 text-yellow-300 border-yellow-800';
      case 'CANCELLED': return 'bg-red-900/30 text-red-300 border-red-800';
      case 'PAUSED': return 'bg-orange-900/30 text-orange-300 border-orange-800';
      case 'EXPIRED': return 'bg-red-900/30 text-red-300 border-red-800';
      case 'UNLIMITED': return 'bg-purple-900/30 text-purple-300 border-purple-800';
      default: return 'bg-zinc-900/30 text-zinc-300 border-zinc-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Activa';
      case 'TRIAL': return 'Prueba';
      case 'CANCELLED': return 'Cancelada';
      case 'PAUSED': return 'Pausada';
      case 'EXPIRED': return 'Expirada';
      case 'UNLIMITED': return 'Ilimitado';
      default: return status;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const getLimitLabel = (limitType: string) => {
    const labels: Record<string, string> = {
      'EVENTS_PER_MONTH': 'Eventos por mes',
      'STORAGE_GB': 'Almacenamiento',
      'TEAM_MEMBERS': 'Miembros del equipo',
      'PORTFOLIOS': 'Portfolios',
      'GANTT_TEMPLATES': 'Plantillas Gantt',
    };
    return labels[limitType] || limitType.replace(/_/g, ' ');
  };

  const getLimitText = (limit: { limit_value: number; unit?: string }) => {
    if (limit.limit_value === -1) return 'Ilimitado';
    if (limit.unit) {
      return `${limit.limit_value} ${limit.unit}`;
    }
    return limit.limit_value.toString();
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 h-full w-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                {plan.name}
                <Badge className="bg-emerald-900/30 text-emerald-300 border-emerald-800 rounded-full">
                  Plan Actual
                </Badge>
                {plan.popular && (
                  <Badge className="bg-blue-900/30 text-blue-300 border-blue-800">
                    Más Popular
                  </Badge>
                )}
              </CardTitle>
              <p className="text-zinc-400 text-sm mt-1">
                {plan.description}
              </p>
            </div>
          </div>
          <div className="text-right">
            {subscription.status === 'UNLIMITED' ? (
              <div className="text-2xl font-bold text-purple-300">
                Ilimitado
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-white">
                  {subscription.billing_interval === 'year'
                    ? formatPrice(plan.price_yearly / 12)
                    : formatPrice(plan.price_monthly)}
                </div>
                <div className="text-zinc-400 text-sm">
                  /mes
                  {subscription.billing_interval === 'year' && (
                    <span className="block text-xs mt-0.5">
                      ({formatPrice(plan.price_yearly)}/año)
                    </span>
                  )}
                </div>
                {subscription.billing_interval && (
                  <div className="mt-1">
                    <Badge className={`text-xs ${subscription.billing_interval === 'year'
                      ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800'
                      : 'bg-zinc-800/50 text-zinc-400 border-zinc-700'
                      }`}>
                      {subscription.billing_interval === 'year' ? 'Facturación Anual' : 'Facturación Mensual'}
                    </Badge>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 flex-1 flex flex-col">
        {subscription.status === 'UNLIMITED' ? (
          <div className="p-4 bg-purple-900/20 border border-purple-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-purple-400 shrink-0" />
              <div className="flex-1">
                <div className="text-white font-medium mb-1">Plan Ilimitado</div>
                <div className="text-purple-300/80 text-sm">
                  Esta cuenta tiene acceso completo sin límites de tiempo. Es un plan especial gestionado manualmente.
                </div>
              </div>
            </div>
          </div>
        ) : subscription.status === 'TRIAL' ? (
          <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400" />
                <div>
                  <div className="text-white font-medium">Período de Prueba</div>
                  <div className="text-blue-300 text-sm">
                    {trialDaysRemaining !== null
                      ? `${trialDaysRemaining} día${trialDaysRemaining !== 1 ? 's' : ''} restante${trialDaysRemaining !== 1 ? 's' : ''}`
                      : 'Prueba activa'}
                  </div>
                </div>
              </div>
              <ZenButton onClick={handleOpenPlansModal} variant="primary" size="sm">
                Elegir Plan
              </ZenButton>
            </div>
            <p className="text-blue-300/80 text-sm">
              Elige un plan antes de que termine tu período de prueba para continuar usando ZEN.
            </p>
          </div>
        ) : subscription.status === 'ACTIVE' ? (
          <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg">
            <div className={`px-2 py-0.5 rounded-full border text-xs ${getStatusColor(subscription.status)}`}>
              <CheckCircle className="h-3 w-3 inline mr-1" />
              {getStatusText(subscription.status)}
            </div>
            <div className="text-zinc-400 text-sm">
              Próximo pago: {formatDate(subscription.current_period_end)}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg">
            <div className={`px-2 py-0.5 rounded-full border text-xs ${getStatusColor(subscription.status)}`}>
              <XCircle className="h-3 w-3 inline mr-1" />
              {getStatusText(subscription.status)}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-white font-medium mb-3">Incluido en tu plan</h4>
          <div className="border border-zinc-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <tbody>
                {limits.map((limit) => (
                  <tr key={limit.id} className="border-b border-zinc-700 last:border-b-0">
                    <td className="px-4 py-2.5 text-zinc-300 text-sm">
                      {getLimitLabel(limit.limit_type)}
                    </td>
                    <td className="px-4 py-2.5 text-white font-medium text-sm text-right">
                      {getLimitText(limit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {plan.features?.highlights && plan.features.highlights.length > 0 && (
          <div>
            <h4 className="text-white font-medium mb-3">Características Incluidas</h4>
            <div className="space-y-2">
              {plan.features.highlights.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-zinc-300">
                  <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {subscription.status === 'UNLIMITED' ? null : subscription.status === 'TRIAL' ? (
          <div className="pt-4 border-t border-zinc-800">
            <ZenButton onClick={handleOpenPlansModal} variant="primary" className="w-full" size="lg">
              <CreditCard className="h-4 w-4 mr-2" />
              Elegir Plan
            </ZenButton>
          </div>
        ) : subscription.status === 'ACTIVE' ? (
          <div className="pt-4 border-t border-zinc-800 flex flex-col gap-3">
            <ZenButton onClick={handleOpenPlansModal} variant="outline" className="w-full">
              Cambiar Plan
            </ZenButton>
            <ZenButton
              onClick={() => setShowCancelModal(true)}
              variant="outline"
              className="w-full border-red-800/50 text-red-300 hover:bg-red-900/20"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancelar Suscripción
            </ZenButton>
          </div>
        ) : subscription.status === 'CANCELLED' ? (
          <div className="pt-4 border-t border-zinc-800 space-y-3">
            <div className="p-4 bg-amber-900/20 border border-amber-800/50 rounded-lg">
              <div className="flex items-start gap-3 mb-2">
                <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-white font-medium mb-1">Suscripción Cancelada</div>
                  <div className="text-amber-300/80 text-sm">
                    Tu suscripción ha sido cancelada. Puedes reactivarla eligiendo un plan antes de que expire el período de retención de datos.
                  </div>
                </div>
              </div>
            </div>
            <ZenButton onClick={handleOpenPlansModal} variant="primary" className="w-full" size="lg">
              <CreditCard className="h-4 w-4 mr-2" />
              Reactivar Suscripción
            </ZenButton>
          </div>
        ) : null}

        <PlansComparisonModal
          open={showPlansModal}
          onClose={() => setShowPlansModal(false)}
          studioSlug={studioSlug}
        />

        <CancelSubscriptionModal
          open={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelSubscription}
          subscriptionEndDate={subscription.current_period_end ? new Date(subscription.current_period_end) : null}
          loading={loadingCancel}
        />
      </CardContent>
    </Card>
  );
}
