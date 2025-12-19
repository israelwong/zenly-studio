'use client';

export function ClientFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-900 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-center text-sm text-zinc-400">
          © {currentYear} Portal de Cliente. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
