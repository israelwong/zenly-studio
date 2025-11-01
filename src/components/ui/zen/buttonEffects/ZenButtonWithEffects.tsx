'use client';

import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { ZenButton, zenButtonVariants } from '../base/ZenButton';
import { VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface ZenButtonWithEffectsProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof zenButtonVariants> {
    effect?: 'none' | 'pulse' | 'border-spin' | 'radial-glow';
    asChild?: boolean;
    children: React.ReactNode;
}

export function ZenButtonWithEffects({
    effect = 'none',
    asChild = false,
    className,
    children,
    variant = 'primary',
    size = 'md',
    ...props
}: ZenButtonWithEffectsProps) {
    const effectClasses = cn(
        effect === 'pulse' && 'animate-pulse',
        effect === 'border-spin' && 'zen-button-border-spin',
        effect === 'radial-glow' && 'zen-button-radial-glow'
    );
    
    if (asChild) {
        return (
            <>
                <style jsx global>{`
                    @keyframes borderSpinRotate {
                        0% {
                            transform: rotate(0deg);
                        }
                        100% {
                            transform: rotate(360deg);
                        }
                    }

                    @keyframes radialGlow {
                        0%, 100% {
                            transform: translate(-50%, -50%) scale(0.8);
                            opacity: 0.6;
                        }
                        50% {
                            transform: translate(-50%, -50%) scale(1.2);
                            opacity: 0.8;
                        }
                    }

                    .zen-button-border-spin-wrapper {
                        position: relative;
                        display: inline-flex;
                        overflow: hidden;
                        border-radius: 0.375rem;
                        padding: 1.5px;
                    }

                    .zen-button-border-spin-wrapper .spin-border {
                        position: absolute;
                        inset: 0;
                        width: 100%;
                        height: 100%;
                        border-radius: inherit;
                        background: conic-gradient(
                            from 0deg,
                            #10b981 0deg,
                            #3b82f6 120deg,
                            #8b5cf6 240deg,
                            #ec4899 360deg
                        );
                        animation: borderSpinRotate 3s linear infinite;
                        z-index: 0;
                    }

                    .zen-button-border-spin {
                        position: relative;
                        z-index: 10;
                        width: 100%;
                        height: 100%;
                        border-radius: inherit;
                    }

                    .zen-button-radial-glow {
                        position: relative;
                        overflow: hidden;
                    }

                    .zen-button-radial-glow::after {
                        content: '';
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        width: 150%;
                        height: 150%;
                        background: radial-gradient(
                            circle at center,
                            rgba(16, 185, 129, 0.5) 0%,
                            rgba(59, 130, 246, 0.4) 30%,
                            rgba(139, 92, 246, 0.2) 60%,
                            transparent 100%
                        );
                        transform: translate(-50%, -50%);
                        animation: radialGlow 3s ease-in-out infinite;
                        z-index: 0;
                        pointer-events: none;
                    }

                    .zen-button-radial-glow > * {
                        position: relative;
                        z-index: 1;
                    }
                `}</style>
                {effect === 'border-spin' ? (
                    <div className="zen-button-border-spin-wrapper">
                        <div className="spin-border" />
                        <Slot className={cn("zen-button-border-spin relative z-10 w-full h-full flex items-center justify-center rounded-md", className)} {...props}>
                            <span className="w-full h-full flex items-center justify-center rounded-md bg-zinc-950 text-white">
                                {children}
                            </span>
                        </Slot>
                    </div>
                ) : (
                    <Slot className={cn(zenButtonVariants({ variant, size }), effectClasses, className)} {...props}>
                        {children}
                    </Slot>
                )}
            </>
        );
    }
    
    return (
        <>
            <style jsx global>{`
                @keyframes borderSpinRotate {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(360deg);
                    }
                }

                @keyframes radialGlow {
                    0%, 100% {
                        transform: translate(-50%, -50%) scale(0.8);
                        opacity: 0.6;
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1.2);
                        opacity: 0.8;
                    }
                }

                .zen-button-border-spin-wrapper {
                    position: relative;
                    display: inline-flex;
                    overflow: hidden;
                    border-radius: 0.375rem;
                    padding: 1.5px;
                }

                .zen-button-border-spin-wrapper .spin-border {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    border-radius: inherit;
                    background: conic-gradient(
                        from 0deg,
                        #10b981 0deg,
                        #3b82f6 120deg,
                        #8b5cf6 240deg,
                        #ec4899 360deg
                    );
                    animation: borderSpinRotate 3s linear infinite;
                    z-index: 0;
                }

                .zen-button-border-spin {
                    position: relative;
                    z-index: 10;
                    width: 100%;
                    height: 100%;
                    border-radius: inherit;
                }

                .zen-button-radial-glow {
                    position: relative;
                    overflow: hidden;
                }

                .zen-button-radial-glow::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 150%;
                    height: 150%;
                    background: radial-gradient(
                        circle at center,
                        rgba(16, 185, 129, 0.5) 0%,
                        rgba(59, 130, 246, 0.4) 30%,
                        rgba(139, 92, 246, 0.2) 60%,
                        transparent 100%
                    );
                    transform: translate(-50%, -50%);
                    animation: radialGlow 3s ease-in-out infinite;
                    z-index: 0;
                    pointer-events: none;
                }

                .zen-button-radial-glow > * {
                    position: relative;
                    z-index: 1;
                }
            `}</style>
            {effect === 'border-spin' ? (
                <div className="zen-button-border-spin-wrapper">
                    <div className="spin-border" />
                    <div className={cn("zen-button-border-spin relative z-10 w-full h-full flex items-center justify-center rounded-md", className)}>
                        <ZenButton
                            variant={variant}
                            size={size}
                            className="w-full h-full bg-zinc-950 text-white border-0"
                            {...props}
                        >
                            {children}
                        </ZenButton>
                    </div>
                </div>
            ) : (
                <ZenButton
                    variant={variant}
                    size={size}
                    className={cn(effectClasses, className)}
                    {...props}
                >
                    {children}
                </ZenButton>
            )}
        </>
    );
}

