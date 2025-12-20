-- CreateEnum
CREATE TYPE "public"."PlatformLeadBitacoraTipo" AS ENUM ('NOTA_PERSONALIZADA', 'CAMBIO_ETAPA', 'ASIGNACION_AGENTE', 'DESASIGNACION_AGENTE', 'CREACION_LEAD', 'ACTUALIZACION_DATOS', 'LLAMADA_REALIZADA', 'EMAIL_ENVIADO', 'REUNION_AGENDADA', 'CONTRATO_FIRMADO', 'SUSCRIPCION_ACTIVA', 'CANCELACION', 'DESCUENTO_APLICADO', 'CODIGO_DESCUENTO_GENERADO');

-- CreateEnum
CREATE TYPE "public"."UnidadMedida" AS ENUM ('BOOLEAN', 'CANTIDAD', 'HORAS', 'USUARIOS', 'CATALOGOS', 'GB', 'PROYECTOS', 'COTIZACIONES', 'LANDING_PAGES');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('SUPER_ADMIN', 'AGENTE', 'SUSCRIPTOR', 'PERSONAL_SUSCRIPTOR', 'CLIENTE_SUSCRIPTOR');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'CANCELLED', 'PAUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."LeadStatus" AS ENUM ('NUEVO', 'CONTACTADO', 'INTERESADO', 'COTIZACION', 'NEGOCIACION', 'CONVERTIDO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "public"."PersonnelType" AS ENUM ('EMPLEADO', 'PROVEEDOR');

-- CreateEnum
CREATE TYPE "public"."PersonalType" AS ENUM ('OPERATIVO', 'ADMINISTRATIVO', 'PROVEEDOR');

-- CreateEnum
CREATE TYPE "public"."ModuleCategory" AS ENUM ('CORE', 'ADDON', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."PlatformRole" AS ENUM ('SUPER_ADMIN', 'AGENTE', 'SUSCRIPTOR');

-- CreateEnum
CREATE TYPE "public"."StudioRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'PHOTOGRAPHER', 'EDITOR', 'ASSISTANT', 'PROVIDER', 'CLIENT');

-- CreateEnum
CREATE TYPE "public"."MarketingStageType" AS ENUM ('PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'CONVERSION', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "public"."LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'WHATSAPP', 'NOTE', 'TASK');

-- CreateEnum
CREATE TYPE "public"."ManagerStageType" AS ENUM ('PLANNING', 'PRODUCTION', 'POST_PRODUCTION', 'DELIVERY', 'WARRANTY', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."DeliverableType" AS ENUM ('PHOTO_GALLERY', 'VIDEO_HIGHLIGHTS', 'FULL_VIDEO', 'ALBUM', 'DIGITAL_DOWNLOAD', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."TaskCategory" AS ENUM ('PLANNING', 'PRODUCTION', 'POST_PRODUCTION', 'REVIEW', 'DELIVERY', 'WARRANTY');

-- CreateEnum
CREATE TYPE "public"."TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TaskAction" AS ENUM ('CREATED', 'UPDATED', 'ASSIGNED', 'STATUS_CHANGED', 'COMPLETED', 'DELETED', 'NOTE_ADDED');

-- CreateTable
CREATE TABLE "public"."platform_billing_cycles" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL,
    "stripe_invoice_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_billing_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_config" (
    "id" TEXT NOT NULL,
    "nombre_empresa" TEXT NOT NULL,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "comercial_telefono" TEXT,
    "comercial_email" TEXT,
    "comercial_whatsapp" TEXT,
    "soporte_telefono" TEXT,
    "soporte_email" TEXT,
    "soporte_chat_url" TEXT,
    "direccion" TEXT,
    "horarios_atencion" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "facebook_url" TEXT,
    "instagram_url" TEXT,
    "twitter_url" TEXT,
    "linkedin_url" TEXT,
    "terminos_condiciones" TEXT,
    "politica_privacidad" TEXT,
    "aviso_legal" TEXT,
    "meta_description" TEXT,
    "meta_keywords" TEXT,
    "google_analytics_id" TEXT,
    "google_tag_manager_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "posicion" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "platform_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_acquisition_channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_acquisition_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_lead_bitacora" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "tipo" "public"."PlatformLeadBitacoraTipo" NOT NULL,
    "titulo" TEXT,
    "descripcion" TEXT NOT NULL,
    "metadata" JSONB,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_lead_bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "studioName" TEXT,
    "studioSlug" TEXT,
    "lastContactDate" TIMESTAMP(3),
    "interestedPlan" TEXT,
    "avatarUrl" TEXT,
    "probableStartDate" TIMESTAMP(3),
    "agentId" TEXT,
    "score" INTEGER,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "conversionDate" TIMESTAMP(3),
    "studioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stageId" TEXT,
    "acquisitionChannelId" TEXT,
    "campañaId" TEXT,
    "agentConversionId" TEXT,
    "firstInteractionDate" TIMESTAMP(3),
    "originalSource" TEXT,
    "conversionMethod" TEXT,
    "interactionCount" INTEGER DEFAULT 0,
    "leadType" TEXT DEFAULT 'prospect',
    "utm_campaign" TEXT,
    "utm_medium" TEXT,
    "utm_source" TEXT,

    CONSTRAINT "platform_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'info',
    "categoria" TEXT NOT NULL DEFAULT 'general',
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "leadId" TEXT,
    "agentId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_pipeline_types" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_pipeline_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_pipeline_stages" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pipeline_type_id" TEXT,

    CONSTRAINT "platform_pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_advertising_platforms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_advertising_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "features" JSONB,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "limits" JSONB,
    "price_monthly" DECIMAL(65,30),
    "price_yearly" DECIMAL(65,30),
    "stripe_price_id" TEXT,
    "stripe_product_id" TEXT,

    CONSTRAINT "platform_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_activities" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "resultado" TEXT,
    "proximaAccion" TEXT,
    "fechaProximaAccion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "platform_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_agents" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "metaMensualLeads" INTEGER NOT NULL DEFAULT 20,
    "comisionConversion" DECIMAL(65,30) NOT NULL DEFAULT 0.05,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_campaign_platforms" (
    "id" TEXT NOT NULL,
    "campañaId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "budget" DECIMAL(65,30) NOT NULL,
    "actualSpend" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_campaign_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalBudget" DECIMAL(65,30) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "leadsGenerated" INTEGER NOT NULL DEFAULT 0,
    "leadsSubscribed" INTEGER NOT NULL DEFAULT 0,
    "actualSpend" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "studio_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_discount_codes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo_descuento" TEXT NOT NULL,
    "valor_descuento" DECIMAL(65,30) NOT NULL,
    "tipo_aplicacion" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "uso_maximo" INTEGER,
    "uso_actual" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "stripe_coupon_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_discount_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_discount_usage" (
    "id" TEXT NOT NULL,
    "discount_code_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "subscription_id" TEXT,
    "monto_descuento" DECIMAL(65,30) NOT NULL,
    "fecha_uso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_discount_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_agent_discount_codes" (
    "id" TEXT NOT NULL,
    "codigo_base" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "agente_id" TEXT NOT NULL,
    "codigo_completo" TEXT NOT NULL,
    "tipo_descuento" TEXT NOT NULL,
    "valor_descuento" DECIMAL(65,30) NOT NULL,
    "duracion_descuento" TEXT NOT NULL,
    "stripe_coupon_id" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_uso" TIMESTAMP(3),
    "subscription_id" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "platform_agent_discount_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studios" (
    "id" TEXT NOT NULL,
    "studio_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "website" TEXT,
    "logo_url" TEXT,
    "plan_id" TEXT,
    "subscription_status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "subscription_start" TIMESTAMP(3),
    "subscription_end" TIMESTAMP(3),
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_account_id" TEXT,
    "stripe_onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "commission_rate" DECIMAL(65,30) NOT NULL DEFAULT 0.30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "isotipo_url" TEXT,
    "palabras_clave" TEXT,
    "slogan" TEXT,

    CONSTRAINT "studios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_configuraciones" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "utilidad_servicio" DOUBLE PRECISION NOT NULL,
    "utilidad_producto" DOUBLE PRECISION NOT NULL,
    "comision_venta" DOUBLE PRECISION NOT NULL,
    "sobreprecio" DOUBLE PRECISION NOT NULL,
    "clave_autorizacion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_configuraciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_agenda" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "userId" TEXT,
    "eventoId" TEXT NOT NULL,
    "concepto" TEXT,
    "descripcion" TEXT,
    "googleMapsUrl" TEXT,
    "direccion" TEXT,
    "fecha" TIMESTAMP(3),
    "hora" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agendaTipo" TEXT,

    CONSTRAINT "studio_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_agenda_tipos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_agenda_tipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_clientes" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "platformUserId" TEXT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_condiciones_comerciales" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "porcentaje_descuento" DOUBLE PRECISION,
    "porcentaje_anticipo" DOUBLE PRECISION DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "orden" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_condiciones_comerciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_condiciones_comerciales_metodo_pago" (
    "id" TEXT NOT NULL,
    "condicionesComercialesId" TEXT NOT NULL,
    "metodoPagoId" TEXT NOT NULL,
    "orden" INTEGER DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_condiciones_comerciales_metodo_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_cotizacion_costos" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "costo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tipo" TEXT NOT NULL DEFAULT 'adicional',
    "posicion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_cotizacion_costos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_cotizacion_servicios" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "servicioId" TEXT,
    "servicioCategoriaId" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "posicion" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "fechaAsignacion" TIMESTAMP(3),
    "FechaEntrega" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "seccion_nombre_snapshot" TEXT,
    "categoria_nombre_snapshot" TEXT,
    "nombre_snapshot" TEXT NOT NULL DEFAULT 'Servicio migrado',
    "descripcion_snapshot" TEXT,
    "precio_unitario_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costo_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gasto_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utilidad_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precio_publico_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tipo_utilidad_snapshot" TEXT NOT NULL DEFAULT 'servicio',
    "precioUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nombre" TEXT,
    "descripcion" TEXT,
    "costo" DOUBLE PRECISION DEFAULT 0,
    "gasto" DOUBLE PRECISION DEFAULT 0,
    "utilidad" DOUBLE PRECISION DEFAULT 0,
    "precio_publico" DOUBLE PRECISION DEFAULT 0,
    "tipo_utilidad" TEXT DEFAULT 'servicio',
    "categoria_nombre" TEXT,
    "seccion_nombre" TEXT,
    "es_personalizado" BOOLEAN NOT NULL DEFAULT false,
    "servicio_original_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_cotizacion_servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_cotizacion_visitas" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_cotizacion_visitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_cotizaciones" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "eventoTipoId" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "descuento" DOUBLE PRECISION,
    "descripcion" TEXT,
    "condicionesComercialesId" TEXT,
    "condicionesComercialesMetodoPagoId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "archivada" BOOLEAN NOT NULL DEFAULT false,
    "visible_cliente" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) DEFAULT (now() + '10 days'::interval),

    CONSTRAINT "studio_cotizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_evento_bitacoras" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "comentario" TEXT NOT NULL,
    "importancia" TEXT NOT NULL DEFAULT '1',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_evento_bitacoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_evento_etapas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_evento_etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_evento_tipos" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_evento_tipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_eventos" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "eventoTipoId" TEXT,
    "nombre" TEXT DEFAULT 'Pendiente',
    "fecha_evento" TIMESTAMP(3) NOT NULL,
    "sede" TEXT,
    "direccion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "eventoEtapaId" TEXT,

    CONSTRAINT "studio_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_gastos" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "descripcion" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "categoria" TEXT NOT NULL,
    "subcategoria" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFactura" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'activo',
    "metodoPago" TEXT,
    "numeroFactura" TEXT,
    "proveedor" TEXT,
    "eventoId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "comprobanteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_metodos_pago" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "metodo_pago" TEXT NOT NULL,
    "comision_porcentaje_base" DOUBLE PRECISION,
    "comision_fija_monto" DOUBLE PRECISION,
    "num_msi" INTEGER,
    "comision_msi_porcentaje" DOUBLE PRECISION,
    "orden" INTEGER DEFAULT 0,
    "payment_method" TEXT DEFAULT 'card',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_metodos_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_nomina_servicios" (
    "id" TEXT NOT NULL,
    "nominaId" TEXT NOT NULL,
    "cotizacionServicioId" TEXT,
    "servicio_nombre" TEXT NOT NULL,
    "seccion_nombre" TEXT,
    "categoria_nombre" TEXT,
    "costo_asignado" DOUBLE PRECISION NOT NULL,
    "cantidad_asignada" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_nomina_servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_nominas" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventoId" TEXT,
    "concepto" TEXT NOT NULL,
    "descripcion" TEXT,
    "monto_bruto" DOUBLE PRECISION NOT NULL,
    "deducciones" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monto_neto" DOUBLE PRECISION NOT NULL,
    "tipo_pago" TEXT NOT NULL DEFAULT 'individual',
    "servicios_incluidos" INTEGER NOT NULL DEFAULT 1,
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_autorizacion" TIMESTAMP(3),
    "fecha_pago" TIMESTAMP(3),
    "periodo_inicio" TIMESTAMP(3),
    "periodo_fin" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "autorizado_por" TEXT,
    "pagado_por" TEXT,
    "metodo_pago" TEXT DEFAULT 'transferencia',
    "costo_total_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gasto_total_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comision_porcentaje" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "personalId" TEXT,

    CONSTRAINT "studio_nominas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_pagos" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT,
    "cotizacionId" TEXT,
    "condicionesComercialesId" TEXT,
    "condicionesComercialesMetodoPagoId" TEXT,
    "metodoPagoId" TEXT,
    "metodo_pago" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "comisionStripe" DOUBLE PRECISION,
    "concepto" TEXT NOT NULL,
    "descripcion" TEXT,
    "stripe_session_id" TEXT,
    "stripe_payment_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "tipo_transaccion" TEXT DEFAULT 'ingreso',
    "categoria_transaccion" TEXT DEFAULT 'abono',

    CONSTRAINT "studio_pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_paquete_servicios" (
    "id" TEXT NOT NULL,
    "paqueteId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "servicioCategoriaId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "posicion" INTEGER NOT NULL DEFAULT 0,
    "visible_cliente" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_paquete_servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_paquetes" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "eventoTipoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "costo" DOUBLE PRECISION,
    "gasto" DOUBLE PRECISION,
    "utilidad" DOUBLE PRECISION,
    "precio" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "posicion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_paquetes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_revenue_products" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "precioPublico" DECIMAL(65,30) NOT NULL,
    "comisionProsocial" DECIMAL(65,30) NOT NULL,
    "comisionStudio" DECIMAL(65,30) NOT NULL,
    "tipoFacturacion" TEXT NOT NULL,
    "cicloVida" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "configuracion" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_revenue_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_revenue_transactions" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "amount_total" DECIMAL(65,30) NOT NULL,
    "prosocial_commission" DECIMAL(65,30) NOT NULL,
    "studio_amount" DECIMAL(65,30) NOT NULL,
    "commission_rate" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripe_transfer_id" TEXT,
    "stripe_fee" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_revenue_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_seccion_categorias" (
    "id" TEXT NOT NULL,
    "seccionId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,

    CONSTRAINT "studio_seccion_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_servicio_categorias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_servicio_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_servicio_gastos" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "costo" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_servicio_gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_servicio_secciones" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_servicio_secciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_servicios" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "servicioCategoriaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "costo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gasto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tipo_utilidad" TEXT NOT NULL DEFAULT 'servicio',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_studio_revenue_products" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "revenueProductId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "precioCustom" DECIMAL(65,30),
    "comisionCustom" DECIMAL(65,30),
    "configuracionStudio" JSONB,
    "activadoEn" TIMESTAMP(3),
    "desactivadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_studio_revenue_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_users" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "platformUserId" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "type" "public"."PersonnelType" NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_user_profiles" (
    "id" TEXT NOT NULL,
    "supabaseUserId" TEXT,
    "email" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "fullName" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "studio_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_user_profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "avatarUrl" TEXT,
    "role" "public"."UserRole" NOT NULL,
    "studio_id" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "billing_cycle_anchor" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plan_services" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "limite" INTEGER,
    "unidad" "public"."UnidadMedida",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "posicion" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_telefonos" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "studio_telefonos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_horarios_atencion" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "dia_semana" TEXT NOT NULL,
    "hora_inicio" TEXT NOT NULL,
    "hora_fin" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_horarios_atencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_social_networks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "baseUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_social_networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_redes_sociales" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "plataformaId" TEXT,
    "url" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "studio_redes_sociales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_cuentas_bancarias" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "numeroCuenta" TEXT NOT NULL,
    "tipoCuenta" TEXT NOT NULL,
    "titular" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_cuentas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_setup_status" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "overallProgress" INTEGER NOT NULL DEFAULT 0,
    "isFullyConfigured" BOOLEAN NOT NULL DEFAULT false,
    "lastValidatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_setup_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."setup_section_progress" (
    "id" TEXT NOT NULL,
    "setupStatusId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completionPercentage" INTEGER NOT NULL DEFAULT 0,
    "completedFields" JSONB NOT NULL,
    "missingFields" JSONB NOT NULL,
    "errors" JSONB,
    "completedAt" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "setup_section_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."setup_section_config" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requiredFields" JSONB NOT NULL,
    "optionalFields" JSONB NOT NULL,
    "dependencies" JSONB NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setup_section_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."setup_progress_log" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "sectionId" TEXT,
    "action" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "details" JSONB,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "setup_progress_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_reglas_agendamiento" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "recurrencia" TEXT NOT NULL,
    "capacidadOperativa" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_reglas_agendamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_personal" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "tipo" "public"."PersonalType" NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "platformUserId" TEXT,
    "honorarios_fijos" DOUBLE PRECISION,
    "honorarios_variables" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cuenta_clabe" TEXT,
    "telefono_emergencia" TEXT,
    "orden" INTEGER,

    CONSTRAINT "studio_personal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_categorias_personal" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "public"."PersonalType" NOT NULL,
    "color" TEXT,
    "icono" TEXT,
    "esDefault" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_categorias_personal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_personal_profiles" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_personal_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_personal_profile_assignments" (
    "id" TEXT NOT NULL,
    "personalId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_personal_profile_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_modules" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."ModuleCategory" NOT NULL,
    "base_price" DECIMAL(65,30),
    "billing_type" TEXT NOT NULL DEFAULT 'MONTHLY',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_modules" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "activated_at" TIMESTAMP(3),
    "deactivated_at" TIMESTAMP(3),
    "config_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "supabase_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_platform_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "public"."PlatformRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by" TEXT,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "user_platform_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_studio_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "role" "public"."StudioRole" NOT NULL,
    "permissions" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invited_by" TEXT,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "user_studio_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_role_permissions" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "role" "public"."StudioRole" NOT NULL,
    "module_slug" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."marketing_pipeline_stages" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "order" INTEGER NOT NULL DEFAULT 0,
    "stage_type" "public"."MarketingStageType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."marketing_leads" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "event_type_id" TEXT,
    "event_date" TIMESTAMP(3),
    "budget_range" TEXT,
    "source_channel_id" TEXT,
    "assigned_to_user_id" TEXT,
    "priority" "public"."LeadPriority" NOT NULL DEFAULT 'MEDIUM',
    "score" INTEGER,
    "last_contact_date" TIMESTAMP(3),
    "next_follow_up_date" TIMESTAMP(3),
    "contact_attempts" INTEGER NOT NULL DEFAULT 0,
    "converted_to_event_id" TEXT,
    "converted_at" TIMESTAMP(3),
    "conversion_value" DECIMAL(65,30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "lost_reason" TEXT,
    "lost_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."marketing_lead_activities" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "public"."ActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "outcome" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."marketing_quotes" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "quote_data" JSONB NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "discount_percent" DECIMAL(65,30) DEFAULT 0,
    "final_amount" DECIMAL(65,30) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "viewed_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."marketing_lead_notes" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_lead_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."manager_pipeline_stages" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#10B981',
    "order" INTEGER NOT NULL DEFAULT 0,
    "stage_type" "public"."ManagerStageType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."manager_events" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "event_type_id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "event_date" TIMESTAMP(3) NOT NULL,
    "venue_name" TEXT,
    "venue_address" TEXT,
    "studio_manager_id" TEXT,
    "contract_value" DECIMAL(65,30) NOT NULL,
    "paid_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "pending_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "originated_from_lead_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."manager_event_tasks" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigned_to_id" TEXT,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_event_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."manager_event_deliverables" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" "public"."DeliverableType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT,
    "file_size_mb" DOUBLE PRECISION,
    "delivered_at" TIMESTAMP(3),
    "client_approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_event_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."manager_event_team" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "hours" DOUBLE PRECISION,
    "cost" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_event_team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."manager_event_timeline" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_event_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."manager_event_payments" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "concept" TEXT,
    "stripe_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_event_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gantt_templates" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "event_type_id" TEXT,
    "estimated_duration_days" INTEGER NOT NULL,
    "pre_event_days" INTEGER NOT NULL,
    "post_event_days" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "icon" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gantt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gantt_template_tasks" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "days_before_event" INTEGER,
    "days_after_event" INTEGER,
    "duration_days" INTEGER NOT NULL DEFAULT 1,
    "category" "public"."TaskCategory" NOT NULL,
    "priority" "public"."TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "depends_on_task_id" TEXT,
    "suggested_role" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "checklist_items" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gantt_template_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gantt_event_instances" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "template_id" TEXT,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "custom_name" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gantt_event_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gantt_event_tasks" (
    "id" TEXT NOT NULL,
    "gantt_instance_id" TEXT NOT NULL,
    "template_task_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "duration_days" INTEGER NOT NULL DEFAULT 1,
    "category" "public"."TaskCategory" NOT NULL,
    "priority" "public"."TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "assigned_to_user_id" TEXT,
    "assigned_at" TIMESTAMP(3),
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'PENDING',
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "completed_by_user_id" TEXT,
    "depends_on_task_id" TEXT,
    "checklist_items" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gantt_event_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gantt_task_activity" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" "public"."TaskAction" NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gantt_task_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_CondicionesComercialesMetodoPagoToCotizacion" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CondicionesComercialesMetodoPagoToCotizacion_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "platform_billing_cycles_period_start_period_end_idx" ON "public"."platform_billing_cycles"("period_start", "period_end");

-- CreateIndex
CREATE INDEX "platform_billing_cycles_status_idx" ON "public"."platform_billing_cycles"("status");

-- CreateIndex
CREATE INDEX "platform_billing_cycles_subscription_id_idx" ON "public"."platform_billing_cycles"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_services_name_key" ON "public"."platform_services"("name");

-- CreateIndex
CREATE UNIQUE INDEX "platform_services_slug_key" ON "public"."platform_services"("slug");

-- CreateIndex
CREATE INDEX "platform_services_active_posicion_idx" ON "public"."platform_services"("active", "posicion");

-- CreateIndex
CREATE INDEX "platform_services_categoryId_idx" ON "public"."platform_services"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_acquisition_channels_name_key" ON "public"."platform_acquisition_channels"("name");

-- CreateIndex
CREATE INDEX "platform_acquisition_channels_isActive_idx" ON "public"."platform_acquisition_channels"("isActive");

-- CreateIndex
CREATE INDEX "platform_acquisition_channels_isVisible_idx" ON "public"."platform_acquisition_channels"("isVisible");

-- CreateIndex
CREATE INDEX "platform_lead_bitacora_createdAt_idx" ON "public"."platform_lead_bitacora"("createdAt");

-- CreateIndex
CREATE INDEX "platform_lead_bitacora_leadId_idx" ON "public"."platform_lead_bitacora"("leadId");

-- CreateIndex
CREATE INDEX "platform_lead_bitacora_tipo_idx" ON "public"."platform_lead_bitacora"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "platform_leads_email_key" ON "public"."platform_leads"("email");

-- CreateIndex
CREATE UNIQUE INDEX "platform_leads_studioId_key" ON "public"."platform_leads"("studioId");

-- CreateIndex
CREATE INDEX "platform_leads_agentId_idx" ON "public"."platform_leads"("agentId");

-- CreateIndex
CREATE INDEX "platform_leads_campañaId_idx" ON "public"."platform_leads"("campañaId");

-- CreateIndex
CREATE INDEX "platform_leads_acquisitionChannelId_idx" ON "public"."platform_leads"("acquisitionChannelId");

-- CreateIndex
CREATE INDEX "platform_leads_stageId_priority_idx" ON "public"."platform_leads"("stageId", "priority");

-- CreateIndex
CREATE INDEX "platform_notifications_createdAt_idx" ON "public"."platform_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "platform_notifications_scheduledFor_idx" ON "public"."platform_notifications"("scheduledFor");

-- CreateIndex
CREATE INDEX "platform_notifications_tipo_categoria_idx" ON "public"."platform_notifications"("tipo", "categoria");

-- CreateIndex
CREATE INDEX "platform_notifications_userId_isActive_idx" ON "public"."platform_notifications"("userId", "isActive");

-- CreateIndex
CREATE INDEX "platform_notifications_userId_isRead_idx" ON "public"."platform_notifications"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "platform_pipeline_types_nombre_key" ON "public"."platform_pipeline_types"("nombre");

-- CreateIndex
CREATE INDEX "platform_pipeline_types_activo_idx" ON "public"."platform_pipeline_types"("activo");

-- CreateIndex
CREATE INDEX "platform_pipeline_types_orden_idx" ON "public"."platform_pipeline_types"("orden");

-- CreateIndex
CREATE INDEX "platform_pipeline_stages_isActive_idx" ON "public"."platform_pipeline_stages"("isActive");

-- CreateIndex
CREATE INDEX "platform_pipeline_stages_orden_idx" ON "public"."platform_pipeline_stages"("orden");

-- CreateIndex
CREATE INDEX "platform_pipeline_stages_pipeline_type_id_idx" ON "public"."platform_pipeline_stages"("pipeline_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_advertising_platforms_name_key" ON "public"."platform_advertising_platforms"("name");

-- CreateIndex
CREATE INDEX "platform_advertising_platforms_isActive_idx" ON "public"."platform_advertising_platforms"("isActive");

-- CreateIndex
CREATE INDEX "platform_advertising_platforms_type_idx" ON "public"."platform_advertising_platforms"("type");

-- CreateIndex
CREATE UNIQUE INDEX "platform_plans_slug_key" ON "public"."platform_plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "platform_plans_stripe_price_id_key" ON "public"."platform_plans"("stripe_price_id");

-- CreateIndex
CREATE INDEX "platform_plans_active_orden_idx" ON "public"."platform_plans"("active", "orden");

-- CreateIndex
CREATE INDEX "platform_plans_stripe_price_id_idx" ON "public"."platform_plans"("stripe_price_id");

-- CreateIndex
CREATE INDEX "platform_activities_leadId_createdAt_idx" ON "public"."platform_activities"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "platform_activities_userId_createdAt_idx" ON "public"."platform_activities"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_agents_email_key" ON "public"."platform_agents"("email");

-- CreateIndex
CREATE INDEX "platform_agents_activo_idx" ON "public"."platform_agents"("activo");

-- CreateIndex
CREATE INDEX "platform_campaign_platforms_campañaId_idx" ON "public"."platform_campaign_platforms"("campañaId");

-- CreateIndex
CREATE INDEX "platform_campaign_platforms_platformId_idx" ON "public"."platform_campaign_platforms"("platformId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_campaign_platforms_campañaId_platformId_key" ON "public"."platform_campaign_platforms"("campañaId", "platformId");

-- CreateIndex
CREATE INDEX "platform_campaigns_startDate_endDate_idx" ON "public"."platform_campaigns"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "platform_campaigns_isActive_idx" ON "public"."platform_campaigns"("isActive");

-- CreateIndex
CREATE INDEX "platform_campaigns_status_idx" ON "public"."platform_campaigns"("status");

-- CreateIndex
CREATE INDEX "platform_campaigns_studio_id_idx" ON "public"."platform_campaigns"("studio_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_discount_codes_codigo_key" ON "public"."platform_discount_codes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "platform_discount_codes_stripe_coupon_id_key" ON "public"."platform_discount_codes"("stripe_coupon_id");

-- CreateIndex
CREATE INDEX "platform_discount_codes_activo_idx" ON "public"."platform_discount_codes"("activo");

-- CreateIndex
CREATE INDEX "platform_discount_codes_fecha_inicio_fecha_fin_idx" ON "public"."platform_discount_codes"("fecha_inicio", "fecha_fin");

-- CreateIndex
CREATE INDEX "platform_discount_codes_stripe_coupon_id_idx" ON "public"."platform_discount_codes"("stripe_coupon_id");

-- CreateIndex
CREATE INDEX "platform_discount_usage_discount_code_id_idx" ON "public"."platform_discount_usage"("discount_code_id");

-- CreateIndex
CREATE INDEX "platform_discount_usage_lead_id_idx" ON "public"."platform_discount_usage"("lead_id");

-- CreateIndex
CREATE INDEX "platform_discount_usage_subscription_id_idx" ON "public"."platform_discount_usage"("subscription_id");

-- CreateIndex
CREATE INDEX "platform_discount_usage_fecha_uso_idx" ON "public"."platform_discount_usage"("fecha_uso");

-- CreateIndex
CREATE UNIQUE INDEX "platform_agent_discount_codes_codigo_completo_key" ON "public"."platform_agent_discount_codes"("codigo_completo");

-- CreateIndex
CREATE UNIQUE INDEX "platform_agent_discount_codes_stripe_coupon_id_key" ON "public"."platform_agent_discount_codes"("stripe_coupon_id");

-- CreateIndex
CREATE INDEX "platform_agent_discount_codes_lead_id_idx" ON "public"."platform_agent_discount_codes"("lead_id");

-- CreateIndex
CREATE INDEX "platform_agent_discount_codes_agente_id_idx" ON "public"."platform_agent_discount_codes"("agente_id");

-- CreateIndex
CREATE INDEX "platform_agent_discount_codes_codigo_completo_idx" ON "public"."platform_agent_discount_codes"("codigo_completo");

-- CreateIndex
CREATE INDEX "platform_agent_discount_codes_usado_idx" ON "public"."platform_agent_discount_codes"("usado");

-- CreateIndex
CREATE INDEX "platform_agent_discount_codes_fecha_expiracion_idx" ON "public"."platform_agent_discount_codes"("fecha_expiracion");

-- CreateIndex
CREATE UNIQUE INDEX "studios_slug_key" ON "public"."studios"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "studios_email_key" ON "public"."studios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "studios_stripe_customer_id_key" ON "public"."studios"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "studios_stripe_subscription_id_key" ON "public"."studios"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "studios_stripe_account_id_key" ON "public"."studios"("stripe_account_id");

-- CreateIndex
CREATE INDEX "studios_plan_id_idx" ON "public"."studios"("plan_id");

-- CreateIndex
CREATE INDEX "studios_slug_idx" ON "public"."studios"("slug");

-- CreateIndex
CREATE INDEX "studios_is_active_idx" ON "public"."studios"("is_active");

-- CreateIndex
CREATE INDEX "studio_configuraciones_studio_id_idx" ON "public"."studio_configuraciones"("studio_id");

-- CreateIndex
CREATE INDEX "studio_agenda_studio_id_idx" ON "public"."studio_agenda"("studio_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_agenda_tipos_nombre_key" ON "public"."studio_agenda_tipos"("nombre");

-- CreateIndex
CREATE INDEX "studio_clientes_studio_id_email_idx" ON "public"."studio_clientes"("studio_id", "email");

-- CreateIndex
CREATE INDEX "studio_clientes_studio_id_status_idx" ON "public"."studio_clientes"("studio_id", "status");

-- CreateIndex
CREATE INDEX "studio_clientes_studio_id_telefono_idx" ON "public"."studio_clientes"("studio_id", "telefono");

-- CreateIndex
CREATE INDEX "studio_clientes_platformUserId_idx" ON "public"."studio_clientes"("platformUserId");

-- CreateIndex
CREATE INDEX "studio_condiciones_comerciales_studio_id_idx" ON "public"."studio_condiciones_comerciales"("studio_id");

-- CreateIndex
CREATE INDEX "studio_cotizaciones_eventoId_idx" ON "public"."studio_cotizaciones"("eventoId");

-- CreateIndex
CREATE INDEX "studio_cotizaciones_studio_id_status_idx" ON "public"."studio_cotizaciones"("studio_id", "status");

-- CreateIndex
CREATE INDEX "studio_eventos_clienteId_idx" ON "public"."studio_eventos"("clienteId");

-- CreateIndex
CREATE INDEX "studio_eventos_fecha_evento_idx" ON "public"."studio_eventos"("fecha_evento");

-- CreateIndex
CREATE INDEX "studio_eventos_studio_id_status_idx" ON "public"."studio_eventos"("studio_id", "status");

-- CreateIndex
CREATE INDEX "studio_gastos_eventoId_idx" ON "public"."studio_gastos"("eventoId");

-- CreateIndex
CREATE INDEX "studio_gastos_fecha_categoria_idx" ON "public"."studio_gastos"("fecha", "categoria");

-- CreateIndex
CREATE INDEX "studio_gastos_studio_id_idx" ON "public"."studio_gastos"("studio_id");

-- CreateIndex
CREATE INDEX "studio_metodos_pago_studio_id_idx" ON "public"."studio_metodos_pago"("studio_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_nomina_servicios_nominaId_cotizacionServicioId_key" ON "public"."studio_nomina_servicios"("nominaId", "cotizacionServicioId");

-- CreateIndex
CREATE INDEX "studio_nominas_studio_id_idx" ON "public"."studio_nominas"("studio_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_pagos_stripe_session_id_key" ON "public"."studio_pagos"("stripe_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_pagos_stripe_payment_id_key" ON "public"."studio_pagos"("stripe_payment_id");

-- CreateIndex
CREATE INDEX "studio_paquetes_studio_id_status_idx" ON "public"."studio_paquetes"("studio_id", "status");

-- CreateIndex
CREATE INDEX "studio_revenue_products_categoria_activo_idx" ON "public"."studio_revenue_products"("categoria", "activo");

-- CreateIndex
CREATE INDEX "studio_revenue_transactions_status_idx" ON "public"."studio_revenue_transactions"("status");

-- CreateIndex
CREATE INDEX "studio_revenue_transactions_studio_id_transaction_date_idx" ON "public"."studio_revenue_transactions"("studio_id", "transaction_date");

-- CreateIndex
CREATE UNIQUE INDEX "studio_seccion_categorias_categoriaId_key" ON "public"."studio_seccion_categorias"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "studio_servicio_categorias_nombre_key" ON "public"."studio_servicio_categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "studio_servicio_secciones_nombre_key" ON "public"."studio_servicio_secciones"("nombre");

-- CreateIndex
CREATE INDEX "studio_servicios_studio_id_status_idx" ON "public"."studio_servicios"("studioId", "status");

-- CreateIndex
CREATE INDEX "studio_servicios_studioId_status_idx" ON "public"."studio_servicios"("studioId", "status");

-- CreateIndex
CREATE INDEX "studio_studio_revenue_products_studio_id_activo_idx" ON "public"."studio_studio_revenue_products"("studio_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "studio_studio_revenue_products_studio_id_revenueProductId_key" ON "public"."studio_studio_revenue_products"("studio_id", "revenueProductId");

-- CreateIndex
CREATE INDEX "studio_users_studio_id_status_idx" ON "public"."studio_users"("studio_id", "status");

-- CreateIndex
CREATE INDEX "studio_users_type_idx" ON "public"."studio_users"("type");

-- CreateIndex
CREATE INDEX "studio_users_isActive_idx" ON "public"."studio_users"("isActive");

-- CreateIndex
CREATE INDEX "studio_users_platformUserId_idx" ON "public"."studio_users"("platformUserId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_user_profiles_supabaseUserId_key" ON "public"."platform_user_profiles"("supabaseUserId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_user_profiles_email_key" ON "public"."platform_user_profiles"("email");

-- CreateIndex
CREATE INDEX "platform_user_profiles_email_idx" ON "public"."platform_user_profiles"("email");

-- CreateIndex
CREATE INDEX "platform_user_profiles_role_idx" ON "public"."platform_user_profiles"("role");

-- CreateIndex
CREATE INDEX "platform_user_profiles_studio_id_idx" ON "public"."platform_user_profiles"("studio_id");

-- CreateIndex
CREATE INDEX "platform_user_profiles_supabaseUserId_idx" ON "public"."platform_user_profiles"("supabaseUserId");

-- CreateIndex
CREATE UNIQUE INDEX "studio_user_profiles_email_key" ON "public"."studio_user_profiles"("email");

-- CreateIndex
CREATE INDEX "studio_user_profiles_email_idx" ON "public"."studio_user_profiles"("email");

-- CreateIndex
CREATE INDEX "studio_user_profiles_role_idx" ON "public"."studio_user_profiles"("role");

-- CreateIndex
CREATE INDEX "studio_user_profiles_studio_id_idx" ON "public"."studio_user_profiles"("studio_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "public"."subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "public"."subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_stripe_subscription_id_idx" ON "public"."subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_studio_id_idx" ON "public"."subscriptions"("studio_id");

-- CreateIndex
CREATE INDEX "plan_services_plan_id_idx" ON "public"."plan_services"("plan_id");

-- CreateIndex
CREATE INDEX "plan_services_service_id_idx" ON "public"."plan_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_services_plan_id_service_id_key" ON "public"."plan_services"("plan_id", "service_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_name_key" ON "public"."service_categories"("name");

-- CreateIndex
CREATE INDEX "service_categories_active_posicion_idx" ON "public"."service_categories"("active", "posicion");

-- CreateIndex
CREATE INDEX "studio_telefonos_studio_id_idx" ON "public"."studio_telefonos"("studio_id");

-- CreateIndex
CREATE INDEX "studio_telefonos_studio_id_activo_idx" ON "public"."studio_telefonos"("studio_id", "activo");

-- CreateIndex
CREATE INDEX "studio_horarios_atencion_studio_id_idx" ON "public"."studio_horarios_atencion"("studio_id");

-- CreateIndex
CREATE INDEX "studio_horarios_atencion_studio_id_dia_semana_idx" ON "public"."studio_horarios_atencion"("studio_id", "dia_semana");

-- CreateIndex
CREATE UNIQUE INDEX "studio_horarios_atencion_studio_id_dia_semana_key" ON "public"."studio_horarios_atencion"("studio_id", "dia_semana");

-- CreateIndex
CREATE UNIQUE INDEX "platform_social_networks_name_key" ON "public"."platform_social_networks"("name");

-- CreateIndex
CREATE UNIQUE INDEX "platform_social_networks_slug_key" ON "public"."platform_social_networks"("slug");

-- CreateIndex
CREATE INDEX "platform_social_networks_isActive_idx" ON "public"."platform_social_networks"("isActive");

-- CreateIndex
CREATE INDEX "platform_social_networks_order_idx" ON "public"."platform_social_networks"("order");

-- CreateIndex
CREATE INDEX "studio_redes_sociales_studio_id_idx" ON "public"."studio_redes_sociales"("studio_id");

-- CreateIndex
CREATE INDEX "studio_redes_sociales_plataformaId_idx" ON "public"."studio_redes_sociales"("plataformaId");

-- CreateIndex
CREATE UNIQUE INDEX "studio_redes_sociales_studio_id_plataformaId_key" ON "public"."studio_redes_sociales"("studio_id", "plataformaId");

-- CreateIndex
CREATE INDEX "studio_cuentas_bancarias_studio_id_idx" ON "public"."studio_cuentas_bancarias"("studio_id");

-- CreateIndex
CREATE INDEX "studio_cuentas_bancarias_activo_idx" ON "public"."studio_cuentas_bancarias"("activo");

-- CreateIndex
CREATE INDEX "studio_cuentas_bancarias_esPrincipal_idx" ON "public"."studio_cuentas_bancarias"("esPrincipal");

-- CreateIndex
CREATE UNIQUE INDEX "studio_setup_status_studio_id_key" ON "public"."studio_setup_status"("studio_id");

-- CreateIndex
CREATE INDEX "studio_setup_status_studio_id_idx" ON "public"."studio_setup_status"("studio_id");

-- CreateIndex
CREATE INDEX "studio_setup_status_isFullyConfigured_idx" ON "public"."studio_setup_status"("isFullyConfigured");

-- CreateIndex
CREATE INDEX "studio_setup_status_overallProgress_idx" ON "public"."studio_setup_status"("overallProgress");

-- CreateIndex
CREATE INDEX "setup_section_progress_sectionId_idx" ON "public"."setup_section_progress"("sectionId");

-- CreateIndex
CREATE INDEX "setup_section_progress_status_idx" ON "public"."setup_section_progress"("status");

-- CreateIndex
CREATE INDEX "setup_section_progress_completionPercentage_idx" ON "public"."setup_section_progress"("completionPercentage");

-- CreateIndex
CREATE UNIQUE INDEX "setup_section_progress_setupStatusId_sectionId_key" ON "public"."setup_section_progress"("setupStatusId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "setup_section_config_sectionId_key" ON "public"."setup_section_config"("sectionId");

-- CreateIndex
CREATE INDEX "setup_section_config_sectionId_idx" ON "public"."setup_section_config"("sectionId");

-- CreateIndex
CREATE INDEX "setup_section_config_isActive_idx" ON "public"."setup_section_config"("isActive");

-- CreateIndex
CREATE INDEX "setup_progress_log_studio_id_idx" ON "public"."setup_progress_log"("studio_id");

-- CreateIndex
CREATE INDEX "setup_progress_log_sectionId_idx" ON "public"."setup_progress_log"("sectionId");

-- CreateIndex
CREATE INDEX "setup_progress_log_action_idx" ON "public"."setup_progress_log"("action");

-- CreateIndex
CREATE INDEX "setup_progress_log_createdAt_idx" ON "public"."setup_progress_log"("createdAt");

-- CreateIndex
CREATE INDEX "studio_reglas_agendamiento_studio_id_idx" ON "public"."studio_reglas_agendamiento"("studio_id");

-- CreateIndex
CREATE INDEX "studio_reglas_agendamiento_status_idx" ON "public"."studio_reglas_agendamiento"("status");

-- CreateIndex
CREATE INDEX "studio_reglas_agendamiento_orden_idx" ON "public"."studio_reglas_agendamiento"("orden");

-- CreateIndex
CREATE INDEX "studio_personal_telefono_emergencia_idx" ON "public"."studio_personal"("telefono_emergencia");

-- CreateIndex
CREATE INDEX "studio_personal_cuenta_clabe_idx" ON "public"."studio_personal"("cuenta_clabe");

-- CreateIndex
CREATE INDEX "studio_personal_studio_id_idx" ON "public"."studio_personal"("studio_id");

-- CreateIndex
CREATE INDEX "studio_personal_tipo_idx" ON "public"."studio_personal"("tipo");

-- CreateIndex
CREATE INDEX "studio_personal_status_idx" ON "public"."studio_personal"("status");

-- CreateIndex
CREATE INDEX "studio_personal_platformUserId_idx" ON "public"."studio_personal"("platformUserId");

-- CreateIndex
CREATE INDEX "studio_categorias_personal_studio_id_tipo_idx" ON "public"."studio_categorias_personal"("studio_id", "tipo");

-- CreateIndex
CREATE INDEX "studio_categorias_personal_studio_id_isActive_idx" ON "public"."studio_categorias_personal"("studio_id", "isActive");

-- CreateIndex
CREATE INDEX "studio_categorias_personal_esDefault_idx" ON "public"."studio_categorias_personal"("esDefault");

-- CreateIndex
CREATE INDEX "studio_categorias_personal_orden_idx" ON "public"."studio_categorias_personal"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "studio_categorias_personal_studio_id_nombre_key" ON "public"."studio_categorias_personal"("studio_id", "nombre");

-- CreateIndex
CREATE INDEX "studio_personal_profiles_studio_id_isActive_idx" ON "public"."studio_personal_profiles"("studio_id", "isActive");

-- CreateIndex
CREATE INDEX "studio_personal_profiles_orden_idx" ON "public"."studio_personal_profiles"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "studio_personal_profiles_studio_id_nombre_key" ON "public"."studio_personal_profiles"("studio_id", "nombre");

-- CreateIndex
CREATE INDEX "studio_personal_profile_assignments_personalId_idx" ON "public"."studio_personal_profile_assignments"("personalId");

-- CreateIndex
CREATE INDEX "studio_personal_profile_assignments_profileId_idx" ON "public"."studio_personal_profile_assignments"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "studio_personal_profile_assignments_personalId_profileId_key" ON "public"."studio_personal_profile_assignments"("personalId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_modules_slug_key" ON "public"."platform_modules"("slug");

-- CreateIndex
CREATE INDEX "platform_modules_category_is_active_idx" ON "public"."platform_modules"("category", "is_active");

-- CreateIndex
CREATE INDEX "studio_modules_studio_id_is_active_idx" ON "public"."studio_modules"("studio_id", "is_active");

-- CreateIndex
CREATE INDEX "studio_modules_module_id_is_active_idx" ON "public"."studio_modules"("module_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "studio_modules_studio_id_module_id_key" ON "public"."studio_modules"("studio_id", "module_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_supabase_id_key" ON "public"."users"("supabase_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_supabase_id_idx" ON "public"."users"("supabase_id");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "public"."users"("is_active");

-- CreateIndex
CREATE INDEX "user_platform_roles_user_id_is_active_idx" ON "public"."user_platform_roles"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "user_platform_roles_role_is_active_idx" ON "public"."user_platform_roles"("role", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "user_platform_roles_user_id_role_key" ON "public"."user_platform_roles"("user_id", "role");

-- CreateIndex
CREATE INDEX "user_studio_roles_user_id_is_active_idx" ON "public"."user_studio_roles"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "user_studio_roles_studio_id_is_active_idx" ON "public"."user_studio_roles"("studio_id", "is_active");

-- CreateIndex
CREATE INDEX "user_studio_roles_role_is_active_idx" ON "public"."user_studio_roles"("role", "is_active");

-- CreateIndex
CREATE INDEX "user_studio_roles_user_id_studio_id_is_active_idx" ON "public"."user_studio_roles"("user_id", "studio_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "user_studio_roles_user_id_studio_id_role_key" ON "public"."user_studio_roles"("user_id", "studio_id", "role");

-- CreateIndex
CREATE INDEX "studio_role_permissions_studio_id_role_idx" ON "public"."studio_role_permissions"("studio_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "studio_role_permissions_studio_id_role_module_slug_key" ON "public"."studio_role_permissions"("studio_id", "role", "module_slug");

-- CreateIndex
CREATE INDEX "marketing_pipeline_stages_studio_id_is_active_order_idx" ON "public"."marketing_pipeline_stages"("studio_id", "is_active", "order");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_pipeline_stages_studio_id_slug_key" ON "public"."marketing_pipeline_stages"("studio_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_leads_converted_to_event_id_key" ON "public"."marketing_leads"("converted_to_event_id");

-- CreateIndex
CREATE INDEX "marketing_leads_studio_id_stage_id_idx" ON "public"."marketing_leads"("studio_id", "stage_id");

-- CreateIndex
CREATE INDEX "marketing_leads_studio_id_is_active_idx" ON "public"."marketing_leads"("studio_id", "is_active");

-- CreateIndex
CREATE INDEX "marketing_leads_assigned_to_user_id_idx" ON "public"."marketing_leads"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "marketing_leads_converted_to_event_id_idx" ON "public"."marketing_leads"("converted_to_event_id");

-- CreateIndex
CREATE INDEX "marketing_leads_event_date_idx" ON "public"."marketing_leads"("event_date");

-- CreateIndex
CREATE INDEX "marketing_lead_activities_lead_id_created_at_idx" ON "public"."marketing_lead_activities"("lead_id", "created_at");

-- CreateIndex
CREATE INDEX "marketing_quotes_lead_id_version_idx" ON "public"."marketing_quotes"("lead_id", "version");

-- CreateIndex
CREATE INDEX "marketing_quotes_expires_at_is_active_idx" ON "public"."marketing_quotes"("expires_at", "is_active");

-- CreateIndex
CREATE INDEX "marketing_lead_notes_lead_id_created_at_idx" ON "public"."marketing_lead_notes"("lead_id", "created_at");

-- CreateIndex
CREATE INDEX "manager_pipeline_stages_studio_id_is_active_order_idx" ON "public"."manager_pipeline_stages"("studio_id", "is_active", "order");

-- CreateIndex
CREATE UNIQUE INDEX "manager_pipeline_stages_studio_id_slug_key" ON "public"."manager_pipeline_stages"("studio_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "manager_events_originated_from_lead_id_key" ON "public"."manager_events"("originated_from_lead_id");

-- CreateIndex
CREATE INDEX "manager_events_studio_id_stage_id_idx" ON "public"."manager_events"("studio_id", "stage_id");

-- CreateIndex
CREATE INDEX "manager_events_event_date_idx" ON "public"."manager_events"("event_date");

-- CreateIndex
CREATE INDEX "manager_events_client_id_idx" ON "public"."manager_events"("client_id");

-- CreateIndex
CREATE INDEX "manager_events_originated_from_lead_id_idx" ON "public"."manager_events"("originated_from_lead_id");

-- CreateIndex
CREATE INDEX "manager_event_tasks_event_id_is_completed_idx" ON "public"."manager_event_tasks"("event_id", "is_completed");

-- CreateIndex
CREATE INDEX "manager_event_deliverables_event_id_type_idx" ON "public"."manager_event_deliverables"("event_id", "type");

-- CreateIndex
CREATE INDEX "manager_event_team_event_id_idx" ON "public"."manager_event_team"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "manager_event_team_event_id_user_id_role_key" ON "public"."manager_event_team"("event_id", "user_id", "role");

-- CreateIndex
CREATE INDEX "manager_event_timeline_event_id_created_at_idx" ON "public"."manager_event_timeline"("event_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "manager_event_payments_stripe_payment_id_key" ON "public"."manager_event_payments"("stripe_payment_id");

-- CreateIndex
CREATE INDEX "manager_event_payments_event_id_payment_date_idx" ON "public"."manager_event_payments"("event_id", "payment_date");

-- CreateIndex
CREATE INDEX "gantt_templates_studio_id_is_active_idx" ON "public"."gantt_templates"("studio_id", "is_active");

-- CreateIndex
CREATE INDEX "gantt_templates_event_type_id_idx" ON "public"."gantt_templates"("event_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "gantt_templates_studio_id_name_key" ON "public"."gantt_templates"("studio_id", "name");

-- CreateIndex
CREATE INDEX "gantt_template_tasks_template_id_order_idx" ON "public"."gantt_template_tasks"("template_id", "order");

-- CreateIndex
CREATE INDEX "gantt_template_tasks_category_idx" ON "public"."gantt_template_tasks"("category");

-- CreateIndex
CREATE UNIQUE INDEX "gantt_event_instances_event_id_key" ON "public"."gantt_event_instances"("event_id");

-- CreateIndex
CREATE INDEX "gantt_event_instances_event_id_idx" ON "public"."gantt_event_instances"("event_id");

-- CreateIndex
CREATE INDEX "gantt_event_instances_template_id_idx" ON "public"."gantt_event_instances"("template_id");

-- CreateIndex
CREATE INDEX "gantt_event_tasks_gantt_instance_id_status_idx" ON "public"."gantt_event_tasks"("gantt_instance_id", "status");

-- CreateIndex
CREATE INDEX "gantt_event_tasks_assigned_to_user_id_idx" ON "public"."gantt_event_tasks"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "gantt_event_tasks_start_date_end_date_idx" ON "public"."gantt_event_tasks"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "gantt_task_activity_task_id_created_at_idx" ON "public"."gantt_task_activity"("task_id", "created_at");

-- CreateIndex
CREATE INDEX "_CondicionesComercialesMetodoPagoToCotizacion_B_index" ON "public"."_CondicionesComercialesMetodoPagoToCotizacion"("B");

-- AddForeignKey
ALTER TABLE "public"."platform_billing_cycles" ADD CONSTRAINT "platform_billing_cycles_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_services" ADD CONSTRAINT "platform_services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_lead_bitacora" ADD CONSTRAINT "platform_lead_bitacora_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."platform_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_lead_bitacora" ADD CONSTRAINT "platform_lead_bitacora_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."studio_user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_leads" ADD CONSTRAINT "platform_leads_acquisitionChannelId_fkey" FOREIGN KEY ("acquisitionChannelId") REFERENCES "public"."platform_acquisition_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_leads" ADD CONSTRAINT "platform_leads_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."platform_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_leads" ADD CONSTRAINT "platform_leads_campañaId_fkey" FOREIGN KEY ("campañaId") REFERENCES "public"."platform_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_leads" ADD CONSTRAINT "platform_leads_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."platform_pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_leads" ADD CONSTRAINT "platform_leads_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "public"."studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_notifications" ADD CONSTRAINT "platform_notifications_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."platform_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_notifications" ADD CONSTRAINT "platform_notifications_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."platform_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_notifications" ADD CONSTRAINT "platform_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."studio_user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_pipeline_stages" ADD CONSTRAINT "platform_pipeline_stages_pipeline_type_id_fkey" FOREIGN KEY ("pipeline_type_id") REFERENCES "public"."platform_pipeline_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_activities" ADD CONSTRAINT "platform_activities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."platform_leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_activities" ADD CONSTRAINT "platform_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."studio_user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_campaign_platforms" ADD CONSTRAINT "platform_campaign_platforms_campañaId_fkey" FOREIGN KEY ("campañaId") REFERENCES "public"."platform_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_campaign_platforms" ADD CONSTRAINT "platform_campaign_platforms_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "public"."platform_advertising_platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_campaigns" ADD CONSTRAINT "platform_campaigns_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_discount_usage" ADD CONSTRAINT "platform_discount_usage_discount_code_id_fkey" FOREIGN KEY ("discount_code_id") REFERENCES "public"."platform_discount_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_discount_usage" ADD CONSTRAINT "platform_discount_usage_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."platform_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_discount_usage" ADD CONSTRAINT "platform_discount_usage_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_agent_discount_codes" ADD CONSTRAINT "platform_agent_discount_codes_agente_id_fkey" FOREIGN KEY ("agente_id") REFERENCES "public"."platform_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_agent_discount_codes" ADD CONSTRAINT "platform_agent_discount_codes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."platform_leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_agent_discount_codes" ADD CONSTRAINT "platform_agent_discount_codes_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studios" ADD CONSTRAINT "studios_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."platform_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_configuraciones" ADD CONSTRAINT "studio_configuraciones_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_agenda" ADD CONSTRAINT "studio_agenda_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "public"."studio_eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_agenda" ADD CONSTRAINT "studio_agenda_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_agenda" ADD CONSTRAINT "studio_agenda_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_clientes" ADD CONSTRAINT "studio_clientes_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "public"."platform_user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_clientes" ADD CONSTRAINT "studio_clientes_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_condiciones_comerciales" ADD CONSTRAINT "studio_condiciones_comerciales_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_condiciones_comerciales_metodo_pago" ADD CONSTRAINT "studio_condiciones_comerciales_metodo_pago_condicionesCome_fkey" FOREIGN KEY ("condicionesComercialesId") REFERENCES "public"."studio_condiciones_comerciales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_condiciones_comerciales_metodo_pago" ADD CONSTRAINT "studio_condiciones_comerciales_metodo_pago_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "public"."studio_metodos_pago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_costos" ADD CONSTRAINT "studio_cotizacion_costos_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."studio_cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" ADD CONSTRAINT "studio_cotizacion_servicios_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."studio_cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" ADD CONSTRAINT "studio_cotizacion_servicios_servicioCategoriaId_fkey" FOREIGN KEY ("servicioCategoriaId") REFERENCES "public"."studio_servicio_categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" ADD CONSTRAINT "studio_cotizacion_servicios_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "public"."studio_servicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_servicios" ADD CONSTRAINT "studio_cotizacion_servicios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizacion_visitas" ADD CONSTRAINT "studio_cotizacion_visitas_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."studio_cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizaciones" ADD CONSTRAINT "studio_cotizaciones_condicionesComercialesId_fkey" FOREIGN KEY ("condicionesComercialesId") REFERENCES "public"."studio_condiciones_comerciales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizaciones" ADD CONSTRAINT "studio_cotizaciones_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "public"."studio_eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizaciones" ADD CONSTRAINT "studio_cotizaciones_eventoTipoId_fkey" FOREIGN KEY ("eventoTipoId") REFERENCES "public"."studio_evento_tipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cotizaciones" ADD CONSTRAINT "studio_cotizaciones_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_evento_bitacoras" ADD CONSTRAINT "studio_evento_bitacoras_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "public"."studio_eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_evento_tipos" ADD CONSTRAINT "studio_evento_tipos_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_eventos" ADD CONSTRAINT "studio_eventos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."studio_clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_eventos" ADD CONSTRAINT "studio_eventos_eventoEtapaId_fkey" FOREIGN KEY ("eventoEtapaId") REFERENCES "public"."studio_evento_etapas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_eventos" ADD CONSTRAINT "studio_eventos_eventoTipoId_fkey" FOREIGN KEY ("eventoTipoId") REFERENCES "public"."studio_evento_tipos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_eventos" ADD CONSTRAINT "studio_eventos_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_eventos" ADD CONSTRAINT "studio_eventos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_gastos" ADD CONSTRAINT "studio_gastos_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "public"."studio_eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_gastos" ADD CONSTRAINT "studio_gastos_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_gastos" ADD CONSTRAINT "studio_gastos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."studio_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_metodos_pago" ADD CONSTRAINT "studio_metodos_pago_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nomina_servicios" ADD CONSTRAINT "studio_nomina_servicios_cotizacionServicioId_fkey" FOREIGN KEY ("cotizacionServicioId") REFERENCES "public"."studio_cotizacion_servicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nomina_servicios" ADD CONSTRAINT "studio_nomina_servicios_nominaId_fkey" FOREIGN KEY ("nominaId") REFERENCES "public"."studio_nominas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nominas" ADD CONSTRAINT "studio_nominas_autorizado_por_fkey" FOREIGN KEY ("autorizado_por") REFERENCES "public"."studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nominas" ADD CONSTRAINT "studio_nominas_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "public"."studio_eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nominas" ADD CONSTRAINT "studio_nominas_pagado_por_fkey" FOREIGN KEY ("pagado_por") REFERENCES "public"."studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nominas" ADD CONSTRAINT "studio_nominas_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "public"."studio_personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nominas" ADD CONSTRAINT "studio_nominas_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_nominas" ADD CONSTRAINT "studio_nominas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."studio_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_pagos" ADD CONSTRAINT "studio_pagos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."studio_clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_pagos" ADD CONSTRAINT "studio_pagos_condicionesComercialesId_fkey" FOREIGN KEY ("condicionesComercialesId") REFERENCES "public"."studio_condiciones_comerciales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_pagos" ADD CONSTRAINT "studio_pagos_condicionesComercialesMetodoPagoId_fkey" FOREIGN KEY ("condicionesComercialesMetodoPagoId") REFERENCES "public"."studio_condiciones_comerciales_metodo_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_pagos" ADD CONSTRAINT "studio_pagos_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."studio_cotizaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_pagos" ADD CONSTRAINT "studio_pagos_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "public"."studio_metodos_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_pagos" ADD CONSTRAINT "studio_pagos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_paquete_servicios" ADD CONSTRAINT "studio_paquete_servicios_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "public"."studio_paquetes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_paquete_servicios" ADD CONSTRAINT "studio_paquete_servicios_servicioCategoriaId_fkey" FOREIGN KEY ("servicioCategoriaId") REFERENCES "public"."studio_servicio_categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_paquete_servicios" ADD CONSTRAINT "studio_paquete_servicios_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "public"."studio_servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_paquetes" ADD CONSTRAINT "studio_paquetes_eventoTipoId_fkey" FOREIGN KEY ("eventoTipoId") REFERENCES "public"."studio_evento_tipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_paquetes" ADD CONSTRAINT "studio_paquetes_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_revenue_transactions" ADD CONSTRAINT "studio_revenue_transactions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_seccion_categorias" ADD CONSTRAINT "studio_seccion_categorias_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "public"."studio_servicio_categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_seccion_categorias" ADD CONSTRAINT "studio_seccion_categorias_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "public"."studio_servicio_secciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_servicio_gastos" ADD CONSTRAINT "studio_servicio_gastos_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "public"."studio_servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_servicios" ADD CONSTRAINT "studio_servicios_studio_id_fkey" FOREIGN KEY ("studioId") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_servicios" ADD CONSTRAINT "studio_servicios_servicioCategoriaId_fkey" FOREIGN KEY ("servicioCategoriaId") REFERENCES "public"."studio_servicio_categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_studio_revenue_products" ADD CONSTRAINT "studio_studio_revenue_products_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_studio_revenue_products" ADD CONSTRAINT "studio_studio_revenue_products_revenueProductId_fkey" FOREIGN KEY ("revenueProductId") REFERENCES "public"."studio_revenue_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_users" ADD CONSTRAINT "studio_users_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "public"."platform_user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_users" ADD CONSTRAINT "studio_users_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platform_user_profiles" ADD CONSTRAINT "platform_user_profiles_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_user_profiles" ADD CONSTRAINT "studio_user_profiles_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."platform_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plan_services" ADD CONSTRAINT "plan_services_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."platform_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plan_services" ADD CONSTRAINT "plan_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."platform_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_telefonos" ADD CONSTRAINT "studio_telefonos_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_horarios_atencion" ADD CONSTRAINT "studio_horarios_atencion_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_redes_sociales" ADD CONSTRAINT "studio_redes_sociales_plataformaId_fkey" FOREIGN KEY ("plataformaId") REFERENCES "public"."platform_social_networks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_redes_sociales" ADD CONSTRAINT "studio_redes_sociales_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_cuentas_bancarias" ADD CONSTRAINT "studio_cuentas_bancarias_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_setup_status" ADD CONSTRAINT "studio_setup_status_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."setup_section_progress" ADD CONSTRAINT "setup_section_progress_setupStatusId_fkey" FOREIGN KEY ("setupStatusId") REFERENCES "public"."studio_setup_status"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_reglas_agendamiento" ADD CONSTRAINT "studio_reglas_agendamiento_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_personal" ADD CONSTRAINT "studio_personal_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "public"."studio_categorias_personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_personal" ADD CONSTRAINT "studio_personal_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "public"."platform_user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_personal" ADD CONSTRAINT "studio_personal_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_categorias_personal" ADD CONSTRAINT "studio_categorias_personal_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_personal_profiles" ADD CONSTRAINT "studio_personal_profiles_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_personal_profile_assignments" ADD CONSTRAINT "studio_personal_profile_assignments_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "public"."studio_personal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_personal_profile_assignments" ADD CONSTRAINT "studio_personal_profile_assignments_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."studio_personal_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_modules" ADD CONSTRAINT "studio_modules_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_modules" ADD CONSTRAINT "studio_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."platform_modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_platform_roles" ADD CONSTRAINT "user_platform_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_studio_roles" ADD CONSTRAINT "user_studio_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_studio_roles" ADD CONSTRAINT "user_studio_roles_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_role_permissions" ADD CONSTRAINT "studio_role_permissions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketing_pipeline_stages" ADD CONSTRAINT "marketing_pipeline_stages_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketing_leads" ADD CONSTRAINT "marketing_leads_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketing_leads" ADD CONSTRAINT "marketing_leads_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."marketing_pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketing_leads" ADD CONSTRAINT "marketing_leads_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "public"."studio_evento_tipos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketing_leads" ADD CONSTRAINT "marketing_leads_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user_studio_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketing_lead_activities" ADD CONSTRAINT "marketing_lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."marketing_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketing_lead_activities" ADD CONSTRAINT "marketing_lead_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_studio_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketing_quotes" ADD CONSTRAINT "marketing_quotes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."marketing_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketing_lead_notes" ADD CONSTRAINT "marketing_lead_notes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."marketing_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketing_lead_notes" ADD CONSTRAINT "marketing_lead_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_studio_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_pipeline_stages" ADD CONSTRAINT "manager_pipeline_stages_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_events" ADD CONSTRAINT "manager_events_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_events" ADD CONSTRAINT "manager_events_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."manager_pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_events" ADD CONSTRAINT "manager_events_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."user_studio_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_events" ADD CONSTRAINT "manager_events_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "public"."studio_evento_tipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_events" ADD CONSTRAINT "manager_events_studio_manager_id_fkey" FOREIGN KEY ("studio_manager_id") REFERENCES "public"."user_studio_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_events" ADD CONSTRAINT "manager_events_originated_from_lead_id_fkey" FOREIGN KEY ("originated_from_lead_id") REFERENCES "public"."marketing_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_event_tasks" ADD CONSTRAINT "manager_event_tasks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."manager_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_event_tasks" ADD CONSTRAINT "manager_event_tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."user_studio_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_event_deliverables" ADD CONSTRAINT "manager_event_deliverables_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."manager_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_event_team" ADD CONSTRAINT "manager_event_team_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."manager_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_event_team" ADD CONSTRAINT "manager_event_team_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_studio_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_event_timeline" ADD CONSTRAINT "manager_event_timeline_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."manager_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_event_timeline" ADD CONSTRAINT "manager_event_timeline_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_studio_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manager_event_payments" ADD CONSTRAINT "manager_event_payments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."manager_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gantt_templates" ADD CONSTRAINT "gantt_templates_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gantt_templates" ADD CONSTRAINT "gantt_templates_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "public"."studio_evento_tipos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gantt_template_tasks" ADD CONSTRAINT "gantt_template_tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."gantt_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gantt_template_tasks" ADD CONSTRAINT "gantt_template_tasks_depends_on_task_id_fkey" FOREIGN KEY ("depends_on_task_id") REFERENCES "public"."gantt_template_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gantt_event_instances" ADD CONSTRAINT "gantt_event_instances_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."manager_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gantt_event_instances" ADD CONSTRAINT "gantt_event_instances_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."gantt_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gantt_event_tasks" ADD CONSTRAINT "gantt_event_tasks_gantt_instance_id_fkey" FOREIGN KEY ("gantt_instance_id") REFERENCES "public"."gantt_event_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gantt_event_tasks" ADD CONSTRAINT "gantt_event_tasks_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user_studio_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gantt_event_tasks" ADD CONSTRAINT "gantt_event_tasks_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."user_studio_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gantt_event_tasks" ADD CONSTRAINT "gantt_event_tasks_depends_on_task_id_fkey" FOREIGN KEY ("depends_on_task_id") REFERENCES "public"."gantt_event_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gantt_task_activity" ADD CONSTRAINT "gantt_task_activity_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."gantt_event_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gantt_task_activity" ADD CONSTRAINT "gantt_task_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_studio_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CondicionesComercialesMetodoPagoToCotizacion" ADD CONSTRAINT "_CondicionesComercialesMetodoPagoToCotizacion_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."studio_condiciones_comerciales_metodo_pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CondicionesComercialesMetodoPagoToCotizacion" ADD CONSTRAINT "_CondicionesComercialesMetodoPagoToCotizacion_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."studio_cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
