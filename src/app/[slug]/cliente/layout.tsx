import { Suspense } from 'react';

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
        {children}
      </Suspense>
    </div>
  );
}
