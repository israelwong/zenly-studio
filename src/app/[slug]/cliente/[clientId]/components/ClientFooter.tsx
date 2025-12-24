'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

export function ClientFooter() {
  const params = useParams();
  const studioSlug = params.slug as string;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-zinc-900/95 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <Link
              href={`/${studioSlug}/cliente/aviso-privacidad`}
              className="hover:text-white transition-colors"
            >
              Aviso de Privacidad
            </Link>
          </div>
          <p className="text-center text-xs text-zinc-400">
            © {currentYear} Portal de Cliente. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
