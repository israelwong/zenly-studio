'use client';

export function ClientFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-zinc-900/95 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <p className="text-center text-xs text-zinc-400">
          © {currentYear} Portal de Cliente. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
