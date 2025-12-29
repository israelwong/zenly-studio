"use client";

import { cn } from "@/lib/utils";

interface SubscriptionBadgeProps {
  status?: string | null;
  planName?: string | null;
  className?: string;
}

export function SubscriptionBadge({
  status,
  planName,
  className,
}: SubscriptionBadgeProps) {
  const getBadgeConfig = () => {
    switch (status) {
      case "TRIAL":
        return {
          text: planName || "TRIAL",
          className:
            "bg-blue-900/20 text-blue-400 border-blue-500/50 shadow-blue-600/20",
        };
      case "ACTIVE":
        return {
          text: planName || "PRO",
          className:
            "bg-emerald-900/20 text-emerald-500 border-emerald-500/50 shadow-emerald-600/20",
        };
      case "PAST_DUE":
      case "UNPAID":
        return {
          text: planName || "VENCIDO",
          className:
            "bg-amber-900/20 text-amber-400 border-amber-500/50 shadow-amber-600/20",
        };
      case "CANCELED":
      case "CANCELLED":
        return {
          text: planName || "CANCELADO",
          className:
            "bg-red-900/20 text-red-400 border-red-500/50 shadow-red-600/20",
        };
      case "UNLIMITED":
        return {
          text: "UNLIMITED",
          className:
            "bg-purple-900/20 text-purple-400 border-purple-500/50 shadow-purple-600/20",
        };
      default:
        return {
          text: planName || "TRIAL",
          className:
            "bg-zinc-900/20 text-zinc-400 border-zinc-500/50 shadow-zinc-600/20",
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 rounded-full text-[10px] font-bold border shadow-sm",
        config.className,
        className
      )}
    >
      {config.text}
    </span>
  );
}

