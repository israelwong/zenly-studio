'use client';

import React from 'react';

interface TerminoCondicion {
  id: string;
  title: string;
  content: string;
  is_required: boolean;
}

interface TerminosCondicionesProps {
  terminos: TerminoCondicion[];
}

export function TerminosCondiciones({ terminos }: TerminosCondicionesProps) {
  if (terminos.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      {terminos.map((termino) => (
        <div key={termino.id} className="text-xs text-zinc-500">
          <p className="font-medium mb-1">{termino.title}</p>
          <div
            dangerouslySetInnerHTML={{ __html: termino.content }}
            className="prose prose-xs prose-invert max-w-none"
          />
        </div>
      ))}
    </div>
  );
}
