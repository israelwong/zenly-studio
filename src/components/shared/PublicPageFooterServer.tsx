import React from 'react';

interface PublicPageFooterServerProps {
  companyName: string;
  commercialName: string;
  domain: string;
}

/**
 * PublicPageFooterServer - Footer unificado para páginas públicas (Server Component)
 * Versión optimizada que recibe datos del servidor, evitando fetch en cliente
 * Usado en: promises layout (optimizado)
 */
export function PublicPageFooterServer({
  companyName,
  commercialName,
  domain,
}: PublicPageFooterServerProps) {
  // ⚠️ FIX: Usar año fijo para evitar diferencias entre servidor y cliente
  // En 2026, usar 2026 directamente para evitar problemas de hidratación
  const currentYear = 2026;
  const displayName = commercialName || companyName || 'Zenly Studio';
  const domainUrl = domain ? `https://${domain}` : 'https://zenly.mx';
  const displayDomain = domain || 'zenly.mx';

  return (
    <footer className=" p-3 pt-5 pb-5 relative">
      {/* Créditos Zenly - Minimalista y discreto */}
      <div className="mt-8 pt-4 relative">
        {/* Separador elegante con efecto de profundidad */}
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-linear-to-r from-transparent via-zinc-800/60 to-transparent rounded-full"></div>
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-linear-to-r from-transparent via-zinc-700/80 to-transparent rounded-full"></div>

        <div className="text-center">
          <p className="text-zinc-500 text-xs font-light">
            by <span className="font-semibold text-zinc-400">{displayName}</span> {currentYear}
          </p>
          <p className="text-zinc-500 text-xs font-light">
            todos los derechos reservados
          </p>
          <a
            href={domainUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 text-xs mt-1 font-light hover:text-zinc-400 transition-colors duration-200"
          >
            {displayDomain}
          </a>
        </div>
      </div>
    </footer>
  );
}
