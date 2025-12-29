-- Migration: Add UNLIMITED to SubscriptionStatus enum
-- Date: 2025-12-30
-- Description: Agrega el estado UNLIMITED para cuentas especiales sin límites de tiempo

-- Agregar UNLIMITED al enum SubscriptionStatus
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'UNLIMITED';

-- Comentario
COMMENT ON TYPE "SubscriptionStatus" IS 'Estados de suscripción: TRIAL, ACTIVE, CANCELLED, PAUSED, EXPIRED, UNLIMITED (cuentas especiales sin Stripe)';

