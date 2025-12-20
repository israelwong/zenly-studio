import React from 'react';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { KanbanHeader } from './KanbanHeader';

interface ErrorStateProps {
    error: string;
    onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
    return (
        <div className="space-y-6">
            <KanbanHeader />
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 text-xl">⚠️</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-red-600">Error al cargar CRM</h3>
                            <p className="text-muted-foreground mt-2">{error}</p>
                        </div>
                        <Button
                            onClick={onRetry}
                            variant="outline"
                        >
                            Reintentar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
