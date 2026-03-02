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
  /** Si true, no aplica borde ni margen superior (el padre controla el contenedor). */
  noBorder?: boolean;
}

export function TerminosCondiciones({ terminos, noBorder }: TerminosCondicionesProps) {
  if (terminos.length === 0) {
    return null;
  }

  return (
    <div className={noBorder ? 'space-y-2' : 'pt-4 mt-4 border-t border-zinc-800/50 space-y-2'}>
      {terminos.map((termino) => (
        <div key={termino.id} className="text-[10px] text-zinc-500 leading-relaxed">
          <div
            dangerouslySetInnerHTML={{ __html: termino.content }}
            className="prose prose-[10px] prose-invert max-w-none [&_h2]:text-[10px] [&_h2]:font-medium [&_h2]:mb-0.5 [&_h2]:mt-1 [&_ul]:text-[10px] [&_ul]:pl-5 [&_ul]:space-y-0.5 [&_ul]:list-disc [&_ul]:list-outside [&_li]:leading-relaxed [&_li]:list-item [&_li]:pl-1 [&_p]:text-[10px] [&_p]:leading-relaxed [&_p]:mb-0.5"
          />
        </div>
      ))}
    </div>
  );
}
