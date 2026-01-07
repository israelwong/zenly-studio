export default function ContactPage() {
    return (
        <div className="min-h-screen bg-zinc-900 text-white">
            {/* Hero Section */}
            <section className="relative py-20 px-4 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
                <div className="container mx-auto max-w-4xl text-center">
                    <h1 className="text-5xl font-bold mb-6">Contacto</h1>
                    <p className="text-xl text-gray-300 mb-8">
                        ¿Necesitas ayuda? Estamos aquí para ti
                    </p>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Nuestro equipo de soporte está listo para ayudarte a sacar el máximo provecho de Zenly Studio.
                    </p>
                </div>
            </section>

            {/* Contact Section */}
            <section className="py-20 px-4">
                <div className="container mx-auto max-w-4xl">
                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Contact Info */}
                        <div>
                            <h2 className="text-3xl font-bold mb-8">Información de Contacto</h2>

                            <div className="space-y-6">
                                <div className="flex items-start">
                                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2">Email</h3>
                                        <p className="text-gray-300">soporte@zenly.mx</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2">Teléfono</h3>
                                        <p className="text-gray-300">+52 (55) 1234-5678</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2">Horarios</h3>
                                        <p className="text-gray-300">Lunes a Viernes: 9:00 AM - 6:00 PM</p>
                                        <p className="text-gray-300">Sábados: 10:00 AM - 2:00 PM</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="bg-zinc-800 p-8 rounded-lg">
                            <h3 className="text-2xl font-bold mb-6">Envíanos un mensaje</h3>
                            <form className="space-y-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                                        Nombre completo
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        className="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Tu nombre completo"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        className="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="tu@email.com"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="subject" className="block text-sm font-medium mb-2">
                                        Asunto
                                    </label>
                                    <input
                                        type="text"
                                        id="subject"
                                        name="subject"
                                        className="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="¿En qué podemos ayudarte?"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium mb-2">
                                        Mensaje
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        rows={5}
                                        className="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Cuéntanos más detalles..."
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg transition-colors font-medium"
                                >
                                    Enviar Mensaje
                                </button>
                            </form>
                        </div>
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