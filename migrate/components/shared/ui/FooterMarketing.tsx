'use client'
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, Calendar, Clock, MessageCircle } from 'lucide-react'

interface FooterProps {
    variant?: 'default' | 'simple'
    showSitemap?: boolean
    showSocial?: boolean
    showContact?: boolean
}

function Footer({
    variant = 'default',
    showSitemap = true,
    showSocial = true,
    showContact = true
}: FooterProps) {

    const currentYear = new Date().getFullYear()

    // Enlaces del sitemap organizados por secciones
    const sitemapSections = [
        {
            title: "Servicios",
            links: [
                { name: "XV Años", href: "/fifteens" },
                { name: "Bodas", href: "/weddings" },
                { name: "Contacto", href: "/contacto" },
            ]
        },
        {
            title: "Información",
            links: [
                // { name: "Nosotros", href: "/nosotros" },
                // { name: "Portafolio", href: "/portafolio" },
                // { name: "Testimonios", href: "/testimonios" },
                { name: "Sobre ProSocial", href: "/contacto" }, // Temporalmente dirigir a contacto
            ]
        },
        {
            title: "Legal",
            links: [
                { name: "Aviso de Privacidad", href: "/aviso-de-privacidad" },
                // { name: "Términos y Condiciones", href: "/terminos" },
            ]
        }
    ]

    // Enlaces de redes sociales
    const socialLinks = [
        {
            name: "Facebook",
            href: "https://www.facebook.com/prosocialmx",
            icon: "fab fa-facebook-f",
            color: "hover:text-blue-500"
        },
        {
            name: "Instagram",
            href: "https://www.instagram.com/prosocialmx",
            icon: "fab fa-instagram",
            color: "hover:text-pink-500"
        },
        {
            name: "YouTube",
            href: "https://www.youtube.com/@prosocial_fifteens",
            icon: "fab fa-youtube",
            color: "hover:text-red-500"
        },
        {
            name: "TikTok",
            href: "https://www.tiktok.com/@prosocialmx",
            icon: "fab fa-tiktok",
            color: "hover:text-white"
        }
    ]

    // Información de contacto
    const contactInfo = [
        {
            icon: <MapPin className="w-4 h-4" />,
            text: "Tecámac, Estado de México",
            href: null
        },
        {
            icon: <Phone className="w-4 h-4" />,
            text: "55 4454 6582",
            href: "tel:+5215544546582"
        },
        {
            icon: <MessageCircle className="w-4 h-4" />,
            text: "WhatsApp: 55 4454 6582",
            href: "https://wa.me/5215544546582"
        },
        {
            icon: <Mail className="w-4 h-4" />,
            text: "contacto@prosocial.mx",
            href: "mailto:contacto@prosocial.mx"
        },
        {
            icon: <Clock className="w-4 h-4" />,
            text: "Lun - Dom: Disponibles",
            href: null
        }
    ]

    if (variant === 'simple') {
        return (
            <footer className="bg-zinc-900 text-white py-8">
                <div className="container mx-auto px-4 text-center">
                    <div className="mb-4">
                        <Image
                            src="/logo-white.png"
                            alt="ProSocial"
                            width={120}
                            height={40}
                            className="mx-auto mb-4"
                        />
                    </div>
                    <p className="text-zinc-400 text-sm mb-4">
                        © {currentYear} ProSocial. Todos los derechos reservados.
                    </p>
                    <div className="text-center">
                        <p className="text-zinc-500 text-xs mb-2">Sitio web diseñado por</p>
                        <Link href="https://promedia.mx" target="_blank" rel="noopener noreferrer">
                            <Image
                                src="https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logo_dark_gray.svg"
                                width={120}
                                height={30}
                                alt="ProMedia"
                                className="h-3 mx-auto"
                                unoptimized
                            />
                        </Link>
                    </div>
                </div>
            </footer>
        )
    }

    return (
        <footer className="bg-zinc-900 text-white">
            {/* Sección principal del footer */}
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Logo y descripción */}
                    <div className="lg:col-span-5 mb-5">
                        <div className="mb-6 flex items-center space-x-3">
                            <Image
                                src="https://bgtapcutchryzhzooony.supabase.co/storage/v1/object/public/ProSocial/logos/isotipo_gris.svg"
                                alt="ProSocial Isotipo"
                                width={30}
                                height={30}
                                className="mb-0"
                            />
                            <h3 className="text-2xl font-bold font-roboto">ProSocial</h3>
                        </div>

                        <p className="text-zinc-400 text-sm leading-relaxed font-roboto max-w-md">
                            Siempre presentes en momentos especiales, creando recuerdos inolvidables para toda la vida.
                        </p>

                        {/* Redes sociales */}
                        {showSocial && (
                            <div className='mt-5'>
                                <h4 className="text-lg font-semibold mb-3 font-roboto">Síguenos</h4>
                                <div className="flex space-x-4">
                                    {socialLinks.map((social) => (
                                        <Link
                                            key={social.name}
                                            href={social.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`text-zinc-400 transition-colors duration-300 ${social.color} p-2 hover:bg-zinc-800 rounded-lg`}
                                            aria-label={social.name}
                                        >
                                            <i className={`${social.icon} text-xl`}></i>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sitemap en grid compacto */}
                    {showSitemap && (
                        <div className="lg:col-span-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-6">
                                {sitemapSections.map((section) => (
                                    <div key={section.title}>
                                        <h4 className="text-lg font-semibold mb-4 font-roboto">{section.title}</h4>
                                        <ul className="space-y-2">
                                            {section.links.map((link) => (
                                                <li key={link.name}>
                                                    <Link
                                                        href={link.href}
                                                        className="text-zinc-400 hover:text-white transition-colors duration-300 text-sm font-roboto hover:pl-2"
                                                    >
                                                        {link.name}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Información de contacto */}
                    {showContact && (
                        <div className="lg:col-span-3">
                            <h4 className="text-lg font-semibold mb-4 font-roboto">Contacto</h4>
                            <ul className="space-y-3">
                                {contactInfo.map((info, index) => (
                                    <li key={index} className="flex items-start space-x-3 group">
                                        <span className="text-zinc-400 mt-1 group-hover:text-white transition-colors">{info.icon}</span>
                                        {info.href ? (
                                            <Link
                                                href={info.href}
                                                className="text-zinc-400 hover:text-white transition-colors duration-300 text-sm font-roboto"
                                            >
                                                {info.text}
                                            </Link>
                                        ) : (
                                            <span className="text-zinc-400 text-sm font-roboto">{info.text}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Sección inferior */}
            <div className="border-t border-zinc-800">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <div className="text-zinc-400 text-sm font-roboto">
                            © {currentYear} ProSocial. Todos los derechos reservados.
                        </div>

                        {/* Crédito de diseño */}
                        <div className="flex items-center space-x-3">
                            <span className="text-zinc-500 text-xs font-roboto">Sitio web diseñado por</span>
                            <Link
                                href="https://promedia.mx"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:opacity-80 transition-opacity flex items-center"
                            >
                                <Image
                                    src="https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logo_dark_gray.svg"
                                    width={80}
                                    height={20}
                                    alt="ProMedia"
                                    className="h-4"
                                    unoptimized
                                />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer
