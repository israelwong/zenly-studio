'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { StudioPublicInfo } from '@/lib/actions/cliente';
import { usePlatformName, usePlatformDomain } from '@/hooks/usePlatformConfig';

export interface ClientFooterProps {
  studioInfo?: StudioPublicInfo | null;
}

export function ClientFooter({ studioInfo }: ClientFooterProps) {
  const params = useParams();
  const studioSlug = params.slug as string;
  const currentYear = new Date().getFullYear();
  const studioName = studioInfo?.studio_name || 'Portal de Cliente';
  const companyName = usePlatformName();
  const domain = usePlatformDomain();
  const domainUrl = domain ? `https://${domain}` : 'https://zenly.mx';

  return (
    <footer className="border-t border-zinc-800 bg-zinc-900/95 px-4 py-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          {/* Copyright del Studio */}
          <p className="text-center text-xs text-zinc-400">
            © {currentYear} {studioName}. Todos los derechos reservados.
          </p>

          {/* Aviso de Privacidad - abajo del nombre del estudio */}
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <Link
              href={`/${studioSlug}/aviso-privacidad`}
              className="hover:text-zinc-300 transition-colors"
            >
              Revisa nuestro aviso de privacidad
            </Link>
          </div>

          {/* Crédito discreto a ZEN México */}
          <div className="pt-2 border-t border-zinc-800/50 w-full">
            <p className="text-center text-[10px] text-zinc-600">
              Powered by{' '}
              <a
                href={domainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                {companyName}
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
