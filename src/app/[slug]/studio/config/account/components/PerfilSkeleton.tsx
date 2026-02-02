'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export function PerfilSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <div className="h-9 w-48 bg-zinc-700 rounded animate-pulse mb-2" />
          <div className="h-5 w-64 bg-zinc-700 rounded animate-pulse" />
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 border-b border-zinc-800 pb-4">
              <div className="h-5 w-5 bg-zinc-700 rounded animate-pulse" />
              <div className="h-6 w-40 bg-zinc-700 rounded animate-pulse" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex justify-center min-h-full">
                  <div className="w-[256px] h-[256px] rounded-full border-2 border-zinc-700 bg-zinc-800 animate-pulse" />
                </div>
                <div className="space-y-6">
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse" />
                        <div className="h-10 w-full bg-zinc-700 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-6 border-t border-zinc-800">
                <div className="h-11 w-40 bg-zinc-700 rounded-lg animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
