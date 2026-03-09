'use client';

import React, { useState } from 'react';
import { Play } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/shadcn/tooltip';
import { cn } from '@/lib/utils';

interface VideoHelpButtonProps {
    /** URL del video (ej. MP4 o enlace embebido). Si está vacía, se muestra mensaje de "no configurado". */
    videoUrl: string;
    /** Título que se muestra en el modal y en el tooltip del botón */
    title: string;
    /** Clases opcionales para el botón */
    className?: string;
}

/**
 * Botón minimalista (icono play) que abre un Dialog con video en auto-play y loop.
 * Uso: tutoriales rápidos (Flash Help) en Finanzas.
 */
export function VideoHelpButton({ videoUrl, title, className }: VideoHelpButtonProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className={cn(
                            'inline-flex items-center justify-center w-7 h-7 rounded-md text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-colors shrink-0',
                            className
                        )}
                        aria-label={`Ver tutorial: ${title}`}
                    >
                        <Play className="h-3.5 w-3.5" fill="currentColor" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs">
                    {title}
                </TooltipContent>
            </Tooltip>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700 p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-4 py-3 border-b border-zinc-800">
                        <DialogTitle className="text-sm font-semibold text-zinc-100">
                            {title}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-4 flex justify-center bg-zinc-950">
                        {videoUrl ? (
                            <video
                                src={videoUrl}
                                title={title}
                                autoPlay
                                loop
                                muted
                                playsInline
                                controls
                                className="max-h-[50vh] w-full rounded-lg object-contain"
                            />
                        ) : (
                            <p className="text-sm text-zinc-500 py-8">Video no configurado. Añade la URL en la configuración.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
