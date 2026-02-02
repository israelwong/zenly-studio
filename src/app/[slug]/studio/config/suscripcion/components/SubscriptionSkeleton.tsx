'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/shadcn/card';

export function SubscriptionSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
      <div className="flex w-full">
        <Card className="bg-zinc-900/50 border-zinc-800 h-full w-full flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="space-y-2">
                  <div className="h-6 w-32 bg-zinc-700 rounded animate-pulse"></div>
                  <div className="h-4 w-48 bg-zinc-700 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="text-right">
                <div className="h-8 w-24 bg-zinc-700 rounded animate-pulse"></div>
                <div className="h-4 w-16 bg-zinc-700 rounded animate-pulse mt-1"></div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 flex flex-col">
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <div className="h-5 w-16 bg-zinc-700 rounded-full animate-pulse"></div>
              <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse mt-2"></div>
            </div>
            <div>
              <div className="h-5 w-40 bg-zinc-700 rounded animate-pulse mb-3"></div>
              <div className="border border-zinc-700 rounded-lg overflow-hidden">
                <div className="divide-y divide-zinc-700">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                      <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse"></div>
                      <div className="h-4 w-20 bg-zinc-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-zinc-800 mt-auto">
              <div className="h-10 flex-1 bg-zinc-700 rounded animate-pulse"></div>
              <div className="h-10 flex-1 bg-zinc-700 rounded animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex w-full">
        <Card className="bg-zinc-900/50 border-zinc-800 h-full w-full flex flex-col">
          <CardHeader>
            <div className="h-6 w-40 bg-zinc-700 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <div className="space-y-2 flex-1 overflow-y-auto pr-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse"></div>
                      <div className="h-3 w-28 bg-zinc-700 rounded animate-pulse"></div>
                    </div>
                    <div className="h-5 w-20 bg-zinc-700 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
