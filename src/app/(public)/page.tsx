import { ZenButton } from '@/components/ui/zen';
import { LoginButton } from './components/LoginButton';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-zinc-900 text-white">
            {/* Header con botón de iniciar sesión */}
            <header className="sticky top-0 z-50 flex items-center justify-end px-4 py-4 md:px-8">
                <LoginButton />
            </header>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        Zenly Studio
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 mb-8">
                        Plataforma integral para estudios creativos
                    </p>
                    <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
                        Gestiona tu estudio, encuentra nuevos clientes y haz crecer tu negocio creativo.
                        Cada estudio tiene su propio espacio personalizado.
                    </p>

                    {/* Ejemplos de estudios */}
                    <div className="mb-12 text-sm text-gray-500">
                        <p>Ejemplos: zenly.mx/fotografia-luna • zenly.mx/video-pro • zenly.mx/estudio-creativo</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="/sign-up"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
                        >
                            Crear Mi Estudio
                        </a>
                        <a
                            href="/about"
                            className="border border-gray-600 hover:border-gray-500 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
                        >
                            Conocer Más
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Estudios en Zenly Studio</h2>
                        <p className="text-xl text-gray-300">
                            Cada estudio tiene su propio espacio personalizado
                        </p>
                    </div>

                    {/* Grid de ejemplos de estudios */}
                    <div className="grid md:grid-cols-3 gap-8 mb-16">
                        <div className="bg-zinc-800 p-6 rounded-lg">
                            <h3 className="text-xl font-bold mb-2">zenly.mx/mi-estudio</h3>
                            <p className="text-gray-300">URL limpia y profesional para tu estudio</p>
                        </div>
                        <div className="bg-zinc-800 p-6 rounded-lg">
                            <h3 className="text-xl font-bold mb-2">Gestión Completa</h3>
                            <p className="text-gray-300">CRM, proyectos, finanzas y más</p>
                        </div>
                        <div className="bg-zinc-800 p-6 rounded-lg">
                            <h3 className="text-xl font-bold mb-2">Branding Personalizado</h3>
                            <p className="text-gray-300">Tu identidad, tu espacio</p>
                        </div>
                    </div>

                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Todo lo que necesitas para tu estudio</h2>
                        <p className="text-xl text-gray-300">
                            Herramientas profesionales diseñadas para creativos
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-zinc-800 p-8 rounded-lg">
                            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-6">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-4">Gestión de Clientes</h3>
                            <p className="text-gray-300">
                                Organiza tu base de clientes, historial de proyectos y comunicaciones en un solo lugar.
                            </p>
                        </div>

                        <div className="bg-zinc-800 p-8 rounded-lg">
                            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-6">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-4">Control de Proyectos</h3>
                            <p className="text-gray-300">
                                Planifica, organiza y da seguimiento a todos tus proyectos desde la concepción hasta la entrega.
                            </p>
                        </div>

                        <div className="bg-zinc-800 p-8 rounded-lg">
                            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-6">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-4">Finanzas</h3>
                            <p className="text-gray-300">
                                Controla ingresos, gastos, cotizaciones y pagos con reportes detallados y analytics.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 bg-zinc-800">
                <div className="container mx-auto max-w-4xl text-center">
                    <h2 className="text-4xl font-bold mb-6">¿Listo para transformar tu estudio?</h2>
                    <p className="text-xl text-gray-300 mb-8">
                        Únete a cientos de creativos que ya están usando Zenly Studio para hacer crecer su negocio.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="/sign-up"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
                        >
                            Crear Cuenta Gratis
                        </a>
                        <a
                            href="/demo"
                            className="border border-gray-600 hover:border-gray-500 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
                        >
                            Ver Demo
                        </a>
                    </div>
                </div>
            </section>

            {/* Simple Footer */}
            <footer className="bg-zinc-800 py-12 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div>
                            <h3 className="text-xl font-bold mb-4">Zenly Studio</h3>
                            <p className="text-gray-400">
                                La plataforma integral para gestión de estudios creativos.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Plataforma</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="/about" className="hover:text-white transition-colors">Acerca de</a></li>
                                <li><a href="/pricing" className="hover:text-white transition-colors">Precios</a></li>
                                <li><a href="/contact" className="hover:text-white transition-colors">Contacto</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Acceso</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="/login" className="hover:text-white transition-colors">Iniciar Sesión</a></li>
                                <li><a href="/sign-up" className="hover:text-white transition-colors">Registrarse</a></li>
                                <li><a href="/admin" className="hover:text-white transition-colors">Admin</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Soporte</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="/contact" className="hover:text-white transition-colors">Contacto</a></li>
                                <li><a href="/help" className="hover:text-white transition-colors">Ayuda</a></li>
                                <li><a href="/docs" className="hover:text-white transition-colors">Documentación</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-zinc-700 mt-8 pt-8 text-center text-gray-400">
                        <p>&copy; 2025 Zenly Studio. Todos los derechos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}