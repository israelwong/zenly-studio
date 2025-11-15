'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/shadcn/card';
import { Shield, Key, History } from 'lucide-react';

export function SecuritySkeleton() {
    return (
        <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="space-y-2">
                <div className="h-8 w-48 bg-zinc-700 rounded animate-pulse"></div>
                <div className="h-4 w-96 bg-zinc-700 rounded animate-pulse"></div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Password Change Card Skeleton */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Key className="h-5 w-5 text-blue-400" />
                            <div className="h-6 w-32 bg-zinc-700 rounded animate-pulse"></div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse"></div>
                            <div className="h-10 w-full bg-zinc-700 rounded animate-pulse"></div>
                        </div>
                        <div className="space-y-3">
                            <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse"></div>
                            <div className="h-10 w-full bg-zinc-700 rounded animate-pulse"></div>
                        </div>
                        <div className="space-y-3">
                            <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse"></div>
                            <div className="h-10 w-full bg-zinc-700 rounded animate-pulse"></div>
                        </div>
                        <div className="h-10 w-32 bg-zinc-700 rounded animate-pulse"></div>
                    </CardContent>
                </Card>

                {/* Security Settings Card Skeleton */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-green-400" />
                            <div className="h-6 w-40 bg-zinc-700 rounded animate-pulse"></div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse"></div>
                                <div className="h-3 w-48 bg-zinc-700 rounded animate-pulse"></div>
                            </div>
                            <div className="w-11 h-6 bg-zinc-700 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse"></div>
                                <div className="h-3 w-48 bg-zinc-700 rounded animate-pulse"></div>
                            </div>
                            <div className="w-11 h-6 bg-zinc-700 rounded-full animate-pulse"></div>
                        </div>
                        <div className="p-4 bg-zinc-800/50 rounded-lg">
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse"></div>
                                <div className="h-2 w-full bg-zinc-700 rounded animate-pulse"></div>
                                <div className="h-4 w-16 bg-zinc-700 rounded animate-pulse"></div>
                            </div>
                        </div>
                        <div className="h-10 w-40 bg-zinc-700 rounded animate-pulse"></div>
                    </CardContent>
                </Card>
            </div>

            {/* Sessions History Card Skeleton */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-orange-400" />
                        <div className="h-6 w-36 bg-zinc-700 rounded animate-pulse"></div>
                        <div className="h-4 w-20 bg-zinc-700 rounded animate-pulse"></div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-4 h-4 bg-zinc-700 rounded animate-pulse flex-shrink-0"></div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-24 bg-zinc-700 rounded animate-pulse"></div>
                                            <div className="h-4 w-12 bg-zinc-700 rounded-full animate-pulse"></div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="h-3 w-32 bg-zinc-700 rounded animate-pulse"></div>
                                            <div className="h-3 w-20 bg-zinc-700 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
