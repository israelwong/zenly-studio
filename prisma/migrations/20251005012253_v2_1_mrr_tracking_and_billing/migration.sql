/*
  Warnings:

  - You are about to drop the column `campañaId` on the `platform_campaign_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `campañaId` on the `platform_leads` table. All the data in the column will be lost.
  - You are about to drop the column `limits` on the `platform_plans` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[campaignId,platformId]` on the table `platform_campaign_platforms` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `campaignId` to the `platform_campaign_platforms` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."PlanLimitType" AS ENUM ('EVENTS_PER_MONTH', 'STORAGE_GB', 'TEAM_MEMBERS', 'PORTFOLIOS', 'LEAD_FORMS', 'ACTIVE_CAMPAIGNS', 'GANTT_TEMPLATES');

-- CreateEnum
CREATE TYPE "public"."SubscriptionItemType" AS ENUM ('PLAN', 'ADDON', 'OVERAGE', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "public"."SubscriptionChangeType" AS ENUM ('PLAN_UPGRADE', 'PLAN_DOWNGRADE', 'ADDON_ADDED', 'ADDON_REMOVED', 'TRIAL_STARTED', 'TRIAL_ENDED', 'CANCELLED', 'REACTIVATED', 'PAUSED', 'RESUMED');

-- DropForeignKey
ALTER TABLE "public"."platform_campaign_platforms" DROP CONSTRAINT "platform_campaign_platforms_campañaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."platform_leads" DROP CONSTRAINT "platform_leads_campañaId_fkey";

-- DropIndex
DROP INDEX "public"."platform_campaign_platforms_campañaId_idx";

-- DropIndex
DROP INDEX "public"."platform_campaign_platforms_campañaId_platformId_key";

-- DropIndex
DROP INDEX "public"."platform_leads_campañaId_idx";

-- DropIndex
DROP INDEX "public"."studio_personal_cuenta_clabe_idx";

-- DropIndex
DROP INDEX "public"."studio_personal_telefono_emergencia_idx";

-- AlterTable
ALTER TABLE "public"."platform_campaign_platforms" DROP COLUMN "campañaId",
ADD COLUMN     "campaignId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."platform_leads" DROP COLUMN "campañaId",
ADD COLUMN     "campaignId" TEXT;

-- AlterTable
ALTER TABLE "public"."platform_plans" DROP COLUMN "limits";

-- CreateTable
CREATE TABLE "public"."plan_limits" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "limit_type" "public"."PlanLimitType" NOT NULL,
    "limit_value" INTEGER NOT NULL,
    "unit" TEXT,

    CONSTRAINT "plan_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscription_items" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "item_type" "public"."SubscriptionItemType" NOT NULL,
    "plan_id" TEXT,
    "module_id" TEXT,
    "overage_type" TEXT,
    "overage_quantity" INTEGER,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "stripe_item_id" TEXT,
    "description" TEXT,
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivated_at" TIMESTAMP(3),

    CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscription_changes" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "change_type" "public"."SubscriptionChangeType" NOT NULL,
    "old_plan_id" TEXT,
    "new_plan_id" TEXT,
    "module_id" TEXT,
    "module_action" TEXT,
    "old_mrr" DECIMAL(65,30),
    "new_mrr" DECIMAL(65,30),
    "mrr_delta" DECIMAL(65,30),
    "reason" TEXT,
    "triggered_by" TEXT,
    "proration_amount" DECIMAL(65,30),
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usage_tracking" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "events_created" INTEGER NOT NULL DEFAULT 0,
    "storage_used_gb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "team_members_active" INTEGER NOT NULL DEFAULT 0,
    "portfolios_created" INTEGER NOT NULL DEFAULT 0,
    "lead_forms_submitted" INTEGER NOT NULL DEFAULT 0,
    "events_overage" INTEGER NOT NULL DEFAULT 0,
    "storage_overage_gb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overage_charges" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mrr_snapshots" (
    "id" TEXT NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "total_mrr" DECIMAL(65,30) NOT NULL,
    "plan_mrr" DECIMAL(65,30) NOT NULL,
    "addon_mrr" DECIMAL(65,30) NOT NULL,
    "overage_mrr" DECIMAL(65,30) NOT NULL,
    "basic_count" INTEGER NOT NULL,
    "basic_mrr" DECIMAL(65,30) NOT NULL,
    "pro_count" INTEGER NOT NULL,
    "pro_mrr" DECIMAL(65,30) NOT NULL,
    "enterprise_count" INTEGER NOT NULL,
    "enterprise_mrr" DECIMAL(65,30) NOT NULL,
    "payment_addon_count" INTEGER NOT NULL,
    "payment_addon_mrr" DECIMAL(65,30) NOT NULL,
    "cloud_addon_count" INTEGER NOT NULL,
    "cloud_addon_mrr" DECIMAL(65,30) NOT NULL,
    "invitation_addon_count" INTEGER NOT NULL,
    "invitation_addon_mrr" DECIMAL(65,30) NOT NULL,
    "pages_addon_count" INTEGER NOT NULL,
    "pages_addon_mrr" DECIMAL(65,30) NOT NULL,
    "new_mrr" DECIMAL(65,30) NOT NULL,
    "expansion_mrr" DECIMAL(65,30) NOT NULL,
    "contraction_mrr" DECIMAL(65,30) NOT NULL,
    "churn_mrr" DECIMAL(65,30) NOT NULL,
    "total_active_studios" INTEGER NOT NULL,
    "new_studios" INTEGER NOT NULL,
    "churned_studios" INTEGER NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mrr_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_limits_plan_id_idx" ON "public"."plan_limits"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_limits_plan_id_limit_type_key" ON "public"."plan_limits"("plan_id", "limit_type");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_items_stripe_item_id_key" ON "public"."subscription_items"("stripe_item_id");

-- CreateIndex
CREATE INDEX "subscription_items_subscription_id_idx" ON "public"."subscription_items"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_items_item_type_idx" ON "public"."subscription_items"("item_type");

-- CreateIndex
CREATE INDEX "subscription_items_plan_id_idx" ON "public"."subscription_items"("plan_id");

-- CreateIndex
CREATE INDEX "subscription_items_module_id_idx" ON "public"."subscription_items"("module_id");

-- CreateIndex
CREATE INDEX "subscription_items_subscription_id_deactivated_at_idx" ON "public"."subscription_items"("subscription_id", "deactivated_at");

-- CreateIndex
CREATE INDEX "subscription_changes_subscription_id_changed_at_idx" ON "public"."subscription_changes"("subscription_id", "changed_at");

-- CreateIndex
CREATE INDEX "subscription_changes_change_type_idx" ON "public"."subscription_changes"("change_type");

-- CreateIndex
CREATE INDEX "subscription_changes_effective_date_idx" ON "public"."subscription_changes"("effective_date");

-- CreateIndex
CREATE INDEX "usage_tracking_studio_id_period_start_idx" ON "public"."usage_tracking"("studio_id", "period_start");

-- CreateIndex
CREATE INDEX "usage_tracking_period_start_period_end_idx" ON "public"."usage_tracking"("period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "usage_tracking_studio_id_period_start_key" ON "public"."usage_tracking"("studio_id", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "mrr_snapshots_snapshot_date_key" ON "public"."mrr_snapshots"("snapshot_date");

-- CreateIndex
CREATE INDEX "mrr_snapshots_snapshot_date_idx" ON "public"."mrr_snapshots"("snapshot_date");

-- CreateIndex
CREATE INDEX "gantt_event_instances_event_date_idx" ON "public"."gantt_event_instances"("event_date");

-- CreateIndex
CREATE INDEX "gantt_event_tasks_status_idx" ON "public"."gantt_event_tasks"("status");

-- CreateIndex
CREATE INDEX "gantt_task_activity_action_idx" ON "public"."gantt_task_activity"("action");

-- CreateIndex
CREATE INDEX "gantt_templates_is_default_idx" ON "public"."gantt_templates"("is_default");

-- CreateIndex
CREATE INDEX "manager_event_deliverables_delivered_at_idx" ON "public"."manager_event_deliverables"("delivered_at");

-- CreateIndex
CREATE INDEX "manager_event_tasks_assigned_to_id_idx" ON "public"."manager_event_tasks"("assigned_to_id");

-- CreateIndex
CREATE INDEX "manager_event_tasks_due_date_idx" ON "public"."manager_event_tasks"("due_date");

-- CreateIndex
CREATE INDEX "manager_event_team_user_id_idx" ON "public"."manager_event_team"("user_id");

-- CreateIndex
CREATE INDEX "manager_event_timeline_action_type_idx" ON "public"."manager_event_timeline"("action_type");

-- CreateIndex
CREATE INDEX "manager_events_is_active_idx" ON "public"."manager_events"("is_active");

-- CreateIndex
CREATE INDEX "marketing_lead_activities_user_id_idx" ON "public"."marketing_lead_activities"("user_id");

-- CreateIndex
CREATE INDEX "marketing_lead_activities_scheduled_at_idx" ON "public"."marketing_lead_activities"("scheduled_at");

-- CreateIndex
CREATE INDEX "marketing_lead_notes_is_pinned_idx" ON "public"."marketing_lead_notes"("is_pinned");

-- CreateIndex
CREATE INDEX "marketing_leads_next_follow_up_date_idx" ON "public"."marketing_leads"("next_follow_up_date");

-- CreateIndex
CREATE INDEX "platform_campaign_platforms_campaignId_idx" ON "public"."platform_campaign_platforms"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_campaign_platforms_campaignId_platformId_key" ON "public"."platform_campaign_platforms"("campaignId", "platformId");

-- CreateIndex
CREATE INDEX "platform_leads_campaignId_idx" ON "public"."platform_leads"("campaignId");

-- CreateIndex
CREATE INDEX "studio_agenda_eventoId_idx" ON "public"."studio_agenda"("eventoId");

-- CreateIndex
CREATE INDEX "studio_agenda_fecha_idx" ON "public"."studio_agenda"("fecha");

-- CreateIndex
CREATE INDEX "studio_condiciones_comerciales_metodo_pago_condicionesComer_idx" ON "public"."studio_condiciones_comerciales_metodo_pago"("condicionesComercialesId");

-- CreateIndex
CREATE INDEX "studio_condiciones_comerciales_metodo_pago_metodoPagoId_idx" ON "public"."studio_condiciones_comerciales_metodo_pago"("metodoPagoId");

-- CreateIndex
CREATE INDEX "studio_cotizacion_costos_cotizacionId_idx" ON "public"."studio_cotizacion_costos"("cotizacionId");

-- CreateIndex
CREATE INDEX "studio_cotizacion_servicios_cotizacionId_idx" ON "public"."studio_cotizacion_servicios"("cotizacionId");

-- CreateIndex
CREATE INDEX "studio_cotizacion_visitas_cotizacionId_createdAt_idx" ON "public"."studio_cotizacion_visitas"("cotizacionId", "createdAt");

-- CreateIndex
CREATE INDEX "studio_cotizaciones_expiresAt_idx" ON "public"."studio_cotizaciones"("expiresAt");

-- CreateIndex
CREATE INDEX "studio_evento_bitacoras_eventoId_createdAt_idx" ON "public"."studio_evento_bitacoras"("eventoId", "createdAt");

-- CreateIndex
CREATE INDEX "studio_evento_etapas_orden_idx" ON "public"."studio_evento_etapas"("orden");

-- CreateIndex
CREATE INDEX "studio_evento_tipos_studio_id_idx" ON "public"."studio_evento_tipos"("studio_id");

-- CreateIndex
CREATE INDEX "studio_evento_tipos_studio_id_status_idx" ON "public"."studio_evento_tipos"("studio_id", "status");

-- CreateIndex
CREATE INDEX "studio_nomina_servicios_nominaId_idx" ON "public"."studio_nomina_servicios"("nominaId");

-- CreateIndex
CREATE INDEX "studio_nominas_status_idx" ON "public"."studio_nominas"("status");

-- CreateIndex
CREATE INDEX "studio_nominas_fecha_asignacion_idx" ON "public"."studio_nominas"("fecha_asignacion");

-- CreateIndex
CREATE INDEX "studio_pagos_status_idx" ON "public"."studio_pagos"("status");

-- CreateIndex
CREATE INDEX "studio_pagos_createdAt_idx" ON "public"."studio_pagos"("createdAt");

-- CreateIndex
CREATE INDEX "studio_pagos_clienteId_idx" ON "public"."studio_pagos"("clienteId");

-- CreateIndex
CREATE INDEX "studio_paquete_servicios_paqueteId_idx" ON "public"."studio_paquete_servicios"("paqueteId");

-- CreateIndex
CREATE INDEX "studio_servicio_categorias_nombre_idx" ON "public"."studio_servicio_categorias"("nombre");

-- CreateIndex
CREATE INDEX "studio_servicio_secciones_nombre_idx" ON "public"."studio_servicio_secciones"("nombre");

-- CreateIndex
CREATE INDEX "studios_subscription_status_idx" ON "public"."studios"("subscription_status");

-- RenameForeignKey
ALTER TABLE "public"."studio_servicios" RENAME CONSTRAINT "studio_servicios_studio_id_fkey" TO "studio_servicios_studioId_fkey";

-- AddForeignKey
ALTER TABLE "public"."platform_leads" ADD CONSTRAINT "platform_leads_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."platform_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_campaign_platforms" ADD CONSTRAINT "platform_campaign_platforms_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."platform_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plan_limits" ADD CONSTRAINT "plan_limits_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."platform_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscription_items" ADD CONSTRAINT "subscription_items_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscription_items" ADD CONSTRAINT "subscription_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."platform_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscription_items" ADD CONSTRAINT "subscription_items_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."platform_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscription_changes" ADD CONSTRAINT "subscription_changes_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usage_tracking" ADD CONSTRAINT "usage_tracking_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
