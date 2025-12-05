"use client";

import { ZenCard } from "@/components/ui/zen";
import { Loader2 } from "lucide-react";

export function PortfolioCardSkeleton() {
    return (
        <ZenCard className="overflow-hidden">
            <div className="flex items-center justify-center gap-3 p-8">
                <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                <p className="text-sm text-zinc-400">
                    Duplicando portfolio...
                </p>
            </div>
        </ZenCard>
    );
}

