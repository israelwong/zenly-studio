"use client";

import React, { useState, useEffect } from "react";
import { XCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import { Button } from "@/components/ui/shadcn/button";
import { ZenButton } from "@/components/ui/zen";
import { toast } from "sonner";
import { getAvailablePlans, createSubscriptionCheckout } from "@/lib/actions/studio/account/suscripcion/stripe-billing.actions";

interface PlansComparisonModalProps {
  open: boolean;
  onClose: () => void;
  studioSlug: string;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id: string | null;
  stripe_price_id_yearly: string | null;
  stripe_product_id: string | null;
  popular: boolean;
  features: unknown;
  limits: Array<{
    limit_type: string;
    limit_value: number;
    unit: string;
  }>;
}

export function PlansComparisonModal({
  open,
  onClose,
  studioSlug,
}: PlansComparisonModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  useEffect(() => {
    if (open) {
      loadPlans();
    }
  }, [open]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const result = await getAvailablePlans();
      if (result.success && result.data) {
        setPlans(result.data);
      } else {
        toast.error("Error al cargar planes disponibles");
      }
    } catch (error) {
      toast.error("Error al cargar planes");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    const priceId = billingInterval === "month" 
      ? plan.stripe_price_id 
      : plan.stripe_price_id_yearly;

    if (!priceId) {
      toast.error(
        `Este plan no tiene precio ${billingInterval === "month" ? "mensual" : "anual"} configurado en Stripe`
      );
      return;
    }

    setLoadingCheckout(plan.id);
    try {
      const returnBaseUrl = typeof window !== "undefined" ? window.location.origin : undefined;
      const result = await createSubscriptionCheckout(studioSlug, priceId, returnBaseUrl);
      if (result.success) {
        if (result.url) {
          // Nueva suscripción: redirigir a Checkout
          window.location.href = result.url;
        } else {
          // Actualización de plan: mostrar éxito y recargar
          toast.success(`Plan actualizado a ${plan.name}. Se aplicó proration automática.`);
          setLoadingCheckout(null);
          onClose();
          // Recargar la página para mostrar el estado actualizado
          window.location.reload();
        }
      } else {
        toast.error(result.error || "Error al procesar cambio de plan");
        setLoadingCheckout(null);
      }
    } catch (error) {
      toast.error("Error al procesar cambio de plan");
      setLoadingCheckout(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(price);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Elige tu Plan</h2>
            <p className="text-zinc-400 text-sm mt-1">
              Selecciona el plan que mejor se adapte a tus necesidades
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>

        {/* Billing Interval Selector */}
        {!loading && plans.length > 0 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              onClick={() => setBillingInterval("month")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                billingInterval === "month"
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingInterval("year")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                billingInterval === "year"
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Anual
              {plans[0]?.price_yearly && plans[0]?.price_monthly && (
                <span className="ml-2 text-xs opacity-80">
                  (Ahorra{" "}
                  {Math.round(
                    ((plans[0].price_monthly * 12 - plans[0].price_yearly) /
                      (plans[0].price_monthly * 12)) *
                      100
                  )}
                  %)
                </span>
              )}
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-400">Cargando planes...</div>
          </div>
        ) : (
          /* Plans Grid */
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`bg-zinc-800/50 border-zinc-700 cursor-pointer hover:border-emerald-500 transition-all ${
                  plan.popular ? "ring-2 ring-emerald-500 border-emerald-500" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-white text-lg">{plan.name}</CardTitle>
                    {plan.popular && (
                      <Badge className="bg-blue-900/30 text-blue-300 border-blue-800">
                        Más Popular
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-white">
                      {formatPrice(
                        billingInterval === "month"
                          ? plan.price_monthly
                          : plan.price_yearly / 12
                      )}
                    </span>
                    <span className="text-zinc-400 text-sm ml-1">
                      /{billingInterval === "month" ? "mes" : "mes"}
                    </span>
                    {billingInterval === "year" && (
                      <div className="text-zinc-500 text-xs mt-1">
                        {formatPrice(plan.price_yearly)}/año
                      </div>
                    )}
                  </div>
                  {plan.description && (
                    <p className="text-zinc-400 text-sm mt-2">{plan.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Features */}
                  {plan.features &&
                    typeof plan.features === "object" &&
                    "highlights" in plan.features &&
                    Array.isArray((plan.features as { highlights: string[] }).highlights) && (
                      <div className="space-y-2">
                        {(plan.features as { highlights: string[] }).highlights
                          .slice(0, 5)
                          .map((feature, index) => (
                            <div key={index} className="flex items-start gap-2 text-zinc-300">
                              <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                      </div>
                    )}

                  {/* Limits Preview */}
                  {plan.limits && plan.limits.length > 0 && (
                    <div className="pt-2 border-t border-zinc-700">
                      <div className="text-xs text-zinc-500 mb-2">Límites incluidos:</div>
                      <div className="space-y-1">
                        {plan.limits.slice(0, 3).map((limit, index) => (
                          <div key={index} className="text-xs text-zinc-400">
                            {limit.limit_type.replace(/_/g, " ")}:{" "}
                            {limit.limit_value === -1 ? "Ilimitado" : `${limit.limit_value} ${limit.unit}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTA Button */}
                  <ZenButton
                    variant={plan.popular ? "primary" : "outline"}
                    className="w-full mt-4"
                    loading={loadingCheckout === plan.id}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {plan.popular ? "Seleccionar Plan" : "Elegir Plan"}
                  </ZenButton>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

