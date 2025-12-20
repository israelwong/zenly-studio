import React from 'react';

export default async function PortfolioEditorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-zinc-950">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-8">
                {children}
            </div>
        </div>
    );
}
