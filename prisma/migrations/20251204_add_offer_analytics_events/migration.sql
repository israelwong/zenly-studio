-- Add new analytics event types for offers
-- SIDEBAR_VIEW: Offer visible in sidebar
-- OFFER_CLICK: Click on offer card

ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'SIDEBAR_VIEW';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'OFFER_CLICK';
