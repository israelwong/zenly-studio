import Link from 'next/link'

/**
 * AuthFooter - Footer minimalista para páginas de autenticación
 * Sin separador decorativo, solo créditos ZEN
 */
export function AuthFooter() {
    return (
        <div className="mt-8 text-center space-y-1">
            <p className="text-zinc-500 text-xs font-light">
                by <Link href="/" className="font-semibold text-zinc-400 hover:text-zinc-300 transition-colors">Zen México</Link> 2025
            </p>
            <p className="text-zinc-500 text-xs font-light">
                todos los derechos reservados
            </p>
            <Link
                href="/"
                className="block text-zinc-500 text-xs font-light hover:text-zinc-400 transition-colors"
            >
                www.zenn.mx
            </Link>
        </div>
    )
}
