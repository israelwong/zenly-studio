export default function PricingPage() {
    return (
        <div className="min-h-screen bg-zinc-900 text-white">
            {/* Hero Section */}
            <section className="relative py-20 px-4 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
                <div className="container mx-auto max-w-4xl text-center">
                    <h1 className="text-5xl font-bold mb-6">Planes y Precios</h1>
                    <p className="text-xl text-gray-300 mb-8">
                        Elige el plan perfecto para tu estudio
                    </p>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Planes flexibles diseñados para estudios de todos los tamaños.
                        Comienza gratis y escala según crezcas.
                    </p>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-20 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Planes para cada necesidad</h2>
                        <p className="text-xl text-gray-300">
                            Desde freelancers hasta estudios grandes, tenemos el plan perfecto para ti
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Plan Básico */}
                        <div className="bg-zinc-800 p-8 rounded-lg border border-zinc-700">
                            <h3 className="text-2xl font-bold mb-4">Básico</h3>
                            <div className="mb-6">
                                <span className="text-4xl font-bold">$0</span>
                                <span className="text-gray-400">/mes</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                    Hasta 5 proyectos activos
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                    Gestión básica de clientes
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                    Reportes básicos
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                    Soporte por email
                                </li>
                            </ul>
                            <button className="w-full bg-zinc-700 hover:bg-zinc-600 text-white py-3 px-6 rounded-lg transition-colors">
                                Comenzar Gratis
                            </button>
                        </div>

                        {/* Plan Profesional */}
                        <div className="bg-zinc-800 p-8 rounded-lg border-2 border-blue-500 relative">
                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                                    Más Popular
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Profesional</h3>
                            <div className="mb-6">
                                <span className="text-4xl font-bold">$29</span>
                                <span className="text-gray-400">/mes</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                    Proyectos ilimitados
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                    Gestión avanzada de clientes
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                    Analytics avanzados
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                    Integraciones
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                    Soporte prioritario
                                </li>
                            </ul>
                            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg transition-colors">
                                Comenzar Prueba
                            </button>
                        </div>

                        {/* Plan Empresarial */}
                        <div className="bg-zinc-800 p-8 rounded-lg border border-zinc-700">
                            <h3 className="text-2xl font-bold mb-4">Empresarial</h3>
                            <div className="mb-6">
                                <span className="text-4xl font-bold">$99</span>
                                <span className="text-gray-400">/mes</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                    Todo lo del plan Profesional
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                    Múltiples usuarios
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                    API personalizada
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                    Soporte 24/7
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                    Personalización
                                </li>
                            </ul>
                            <button className="w-full bg-zinc-700 hover:bg-zinc-600 text-white py-3 px-6 rounded-lg transition-colors">
                                Contactar Ventas
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Simple Footer */}
            <footer className="bg-zinc-800 py-12 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div>
                            <h3 className="text-xl font-bold mb-4">ProSocial Platform</h3>
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
                        <p>&copy; 2024 ProSocial Platform. Todos los derechos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}