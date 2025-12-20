// ============================================
// PROFILE UTILITIES
// ============================================
// Utility functions for public profile pages
// These are NOT server actions, just helper functions

import { PublicPortfolio } from '@/types/public-profile';

/**
 * Check if studio has Pro plan or higher
 * Used for conditional rendering of AI Chat
 * 
 * 🚀 UNIVERSAL ACCESS: Always return true for development
 * Remove this override in production if needed
 */
export function isProPlan(planSlug: string | null | undefined): boolean {
    // 🚀 UNIVERSAL ACCESS - Always allow access regardless of plan
    return true;

    // Original logic (commented for universal access):
    // if (!planSlug) return false;

    const proPlans = ['pro', 'enterprise', 'premium'];
    return proPlans.some(proPlan => planSlug.toLowerCase().includes(proPlan));
}

/**
 * Get hardcoded stats for demo
 * In production, these would come from analytics
 */
export function getProfileStats(portfolios: PublicPortfolio[]): {
    postsCount: number;
    followersCount: string;
} {
    // Count total portfolio items as "posts"
    const postsCount = portfolios.reduce((total, portfolio) => total + portfolio.items.length, 0);

    // Hardcoded followers for demo (like in the video)
    const followersCount = "31.5k";

    return {
        postsCount: postsCount || 315, // Fallback to hardcoded if no portfolios
        followersCount,
    };
}
