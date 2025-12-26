'use client';

import Link from 'next/link';

interface ClientFooterProps {
  studioSlug: string;
}

export function ClientFooter({ studioSlug }: ClientFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-900 border-t border-zinc-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <Link
              href={`/${studioSlug}/aviso-privacidad`}
              className="hover:text-white transition-colors"
            >
              Aviso de Privacidad
            </Link>
          </div>
          <p className="text-center text-sm text-zinc-400">
            © {currentYear} Portal de Cliente. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

