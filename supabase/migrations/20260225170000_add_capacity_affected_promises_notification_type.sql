-- Migration: add CAPACITY_AFFECTED_PROMISES to StudioNotificationType enum
-- Purpose: allow notifyCapacityAffectedPromises to create studio notifications when a booking affects other promises (same date).
-- Affected: studio_notifications.type (enum StudioNotificationType)

alter type "StudioNotificationType" add value if not exists 'CAPACITY_AFFECTED_PROMISES';
