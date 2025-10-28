'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronDown, Calendar, Mail } from 'lucide-react';
import { usePathname } from 'next/navigation'
import Image from 'next/image';

interface SubmenuItem {
    name: string;
    link: string;
    description: string;
    status?: 'active' | 'beta' | 'coming-soon';
}

interface MenuItem {
    name: string;
    link: string | null;
    icon: React.ReactNode | null;
    status: 'active' | 'beta' | 'coming-soon';
    timeline?: string;
    submenu?: SubmenuItem[];
}

export default function NavbarV2() {
    const pathname = usePathname()
    const navbarRef = useRef<HTMLElement>(null)
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeItem, setActiveItem] = useState('');
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    useEffect(() => {
        setActiveItem(pathname || '')
    }, [pathname])

    // Effect para cerrar dropdown al hacer click fuera del navbar
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (navbarRef.current && !navbarRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        };

        // Solo agregar el listener si hay un dropdown abierto
        if (openDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        // Cleanup del event listener
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openDropdown]);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleLinkClick = (path: string) => {
        setActiveItem(path);
        setIsMenuOpen(false);
        setOpenDropdown(null);
    };

    const toggleDropdown = (menuName: string) => {
        setOpenDropdown(openDropdown === menuName ? null : menuName);
    };

    // Estructura del menú simplificada
    const menu: MenuItem[] = [
        {
            name: 'Principal',
            link: "/",
            icon: null,
            status: 'active'
        },
        {
            name: 'Fifteens',
            link: "/fifteens",
            icon: <Calendar className="w-4 h-4" />,
            status: 'active'
        },
        {
            name: 'Weddings',
            link: "/weddings",
            icon: <Calendar className="w-4 h-4" />,
            status: 'active'
        },
        {
            name: 'Contacto',
            link: "/contacto",
            icon: <Mail className="w-4 h-4" />,
            status: 'active'
        }
    ];

    const getStatusBadge = (status: 'active' | 'beta' | 'coming-soon', timeline?: string) => {
        switch (status) {
            case 'coming-soon':
                return (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                        {timeline || 'Soon'}
                    </span>
                );
            case 'beta':
                return (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-500/20 text-green-300 rounded-full border border-green-500/30">
                        Beta
                    </span>
                );
            case 'active':
            default:
                return null;
        }
    };

    return (
        <header ref={navbarRef} className="bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 text-white sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Logo */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" onClick={() => handleLinkClick('/')} className="flex items-center">
                            <Image
                                src="https://bgtapcutchryzhzooony.supabase.co/storage/v1/object/public/ProSocial/logos/logotipo_gris.svg"
                                width={120}
                                height={40}
                                alt="ProSocial"
                                className="h-10 w-auto"
                                unoptimized
                            />
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center space-x-2">
                        {menu.map((item, index) => (
                            <div key={index} className="relative">
                                {item.submenu ? (
                                    // Dropdown menu
                                    <div className="relative">
                                        <button
                                            className={`
                                                flex items-center px-3 py-2 text-sm font-medium transition-all duration-300 rounded-md
                                                font-roboto tracking-wide
                                                ${openDropdown === item.name
                                                    ? 'text-white bg-zinc-800/50 shadow-lg border border-zinc-700'
                                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                                                }
                                            `}
                                            onClick={() => toggleDropdown(item.name)}
                                        >
                                            {item.icon}
                                            <span className="ml-2">{item.name}</span>
                                            {getStatusBadge(item.status, item.timeline)}
                                            <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${openDropdown === item.name ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Dropdown content */}
                                        {openDropdown === item.name && (
                                            <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50">
                                                <div className="py-2">
                                                    {item.submenu.map((subItem, subIndex) => (
                                                        <Link
                                                            key={subIndex}
                                                            href={subItem.status === 'coming-soon' ? '#' : subItem.link}
                                                            className={`block px-4 py-3 text-sm transition-colors ${subItem.status === 'coming-soon'
                                                                ? 'text-zinc-500 cursor-not-allowed'
                                                                : 'text-zinc-300 hover:text-white hover:bg-zinc-700/50'
                                                                }`}
                                                            onClick={(e) => {
                                                                if (subItem.status === 'coming-soon') {
                                                                    e.preventDefault();
                                                                    return;
                                                                }
                                                                handleLinkClick(subItem.link);
                                                            }}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <div className="font-medium">{subItem.name}</div>
                                                                    <div className="text-xs text-zinc-500">{subItem.description}</div>
                                                                </div>
                                                                {subItem.status && getStatusBadge(subItem.status)}
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // Regular link
                                    <Link
                                        href={item.link || '#'}
                                        className={`
                                            flex items-center px-3 py-2 text-sm font-medium transition-all duration-300 rounded-md
                                            font-roboto tracking-wide
                                            ${activeItem === item.link
                                                ? 'text-white bg-zinc-800/50 shadow-lg border border-zinc-700'
                                                : item.status === 'coming-soon'
                                                    ? 'text-zinc-500 cursor-not-allowed'
                                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                                            }
                                        `}
                                        onClick={(e) => {
                                            if (item.status === 'coming-soon') {
                                                e.preventDefault();
                                                return;
                                            }
                                            handleLinkClick(item.link || '');
                                        }}
                                    >
                                        {item.icon}
                                        <span className="ml-2">{item.name}</span>
                                        {getStatusBadge(item.status, item.timeline)}
                                        {activeItem === item.link && (
                                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                                        )}
                                    </Link>
                                )}
                            </div>
                        ))}
                    </nav>

                    {/* Mobile menu button */}
                    <button
                        onClick={toggleMenu}
                        className="lg:hidden p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
                <>
                    {/* Ocultar footer y otros elementos fixed cuando menu está abierto */}
                    <style jsx global>{`
                        /* Ocultar todos los elementos fixed excepto nuestro navbar */
                        .fixed:not(header):not(header *),
                        .sticky:not(header):not(header *),
                        footer,
                        [data-footer],
                        .footer,
                        div[class*="fixed bottom"],
                        div[class*="sticky bottom"],
                        div[class*="fixed inset-x-0 bottom"],
                        div[class*="bottom-0"],
                        div[class*="fixed"][class*="bottom"],
                        div[class*="sticky"][class*="bottom"],
                        .fixed.bottom-0,
                        .sticky.bottom-0 {
                            display: none !important;
                            visibility: hidden !important;
                            opacity: 0 !important;
                        }
                        /* Evitar scroll de la página */
                        html, body {
                            overflow: hidden !important;
                            height: 100vh !important;
                        }
                    `}</style>

                    <div className="lg:hidden fixed top-0 left-0 w-screen h-screen bg-black/90 z-[99999]" style={{ zIndex: 999999 }} onClick={toggleMenu}>
                        <div className="fixed top-0 left-0 w-screen h-screen bg-zinc-900 z-[99999] transform transition-transform duration-300 overflow-hidden" style={{ zIndex: 999999 }} onClick={(e) => e.stopPropagation()}>
                            <div className="w-full h-screen flex flex-col">
                                {/* Mobile Header */}
                                <div className="flex items-center justify-between p-4 border-b border-zinc-800 flex-shrink-0">
                                    <Image
                                        src="https://bgtapcutchryzhzooony.supabase.co/storage/v1/object/public/ProSocial/logos/logotipo_gris.svg"
                                        width={100}
                                        height={32}
                                        alt="ProSocial"
                                        className="h-6 w-auto"
                                        unoptimized
                                    />
                                    <button
                                        onClick={toggleMenu}
                                        className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                {/* Mobile Menu Items */}
                                <nav className="flex-1 px-6 py-8 overflow-y-auto">
                                    <div className="space-y-3">
                                        {menu.map((item, index) => (
                                            <div key={index}>
                                                {item.submenu ? (
                                                    <div>
                                                        <button
                                                            className="w-full flex items-center justify-between px-4 py-4 text-lg font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all duration-200"
                                                            onClick={() => toggleDropdown(item.name)}
                                                        >
                                                            <div className="flex items-center">
                                                                {item.icon}
                                                                <span className="ml-4">{item.name}</span>
                                                                {getStatusBadge(item.status, item.timeline)}
                                                            </div>
                                                            <ChevronDown className={`w-5 h-5 transition-transform ${openDropdown === item.name ? 'rotate-180' : ''}`} />
                                                        </button>

                                                        {openDropdown === item.name && (
                                                            <div className="ml-8 mt-3 space-y-2">
                                                                {item.submenu.map((subItem, subIndex) => (
                                                                    <Link
                                                                        key={subIndex}
                                                                        href={subItem.status === 'coming-soon' ? '#' : subItem.link}
                                                                        className={`block px-4 py-3 text-base rounded-md transition-colors ${subItem.status === 'coming-soon'
                                                                            ? 'text-zinc-500 cursor-not-allowed'
                                                                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                                                                            }`}
                                                                        onClick={(e) => {
                                                                            if (subItem.status === 'coming-soon') {
                                                                                e.preventDefault();
                                                                                return;
                                                                            }
                                                                            handleLinkClick(subItem.link);
                                                                        }}
                                                                    >
                                                                        <div>
                                                                            <div className="font-medium">{subItem.name}</div>
                                                                            <div className="text-sm text-zinc-500 mt-1">{subItem.description}</div>
                                                                        </div>
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Link
                                                        href={item.link || '#'}
                                                        className={`
                                                        flex items-center px-4 py-4 text-lg font-medium rounded-lg transition-all duration-200
                                                        ${activeItem === item.link
                                                                ? 'text-white bg-purple-600 shadow-sm'
                                                                : item.status === 'coming-soon'
                                                                    ? 'text-zinc-500 cursor-not-allowed'
                                                                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                                                            }
                                                    `}
                                                        onClick={(e) => {
                                                            if (item.status === 'coming-soon') {
                                                                e.preventDefault();
                                                                return;
                                                            }
                                                            handleLinkClick(item.link || '');
                                                        }}
                                                    >
                                                        {item.icon}
                                                        <span className="ml-4">{item.name}</span>
                                                        {getStatusBadge(item.status, item.timeline)}
                                                    </Link>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </nav>

                                {/* Mobile Footer */}
                                <div className="p-6 border-t border-zinc-800 bg-zinc-950 flex-shrink-0">
                                    <p className="text-center text-base text-zinc-500 font-roboto">
                                        Eventos únicos e inolvidables
                                    </p>
                                    <p className="text-center text-sm text-zinc-600 mt-2">
                                        Quinceañeras • Bodas • Celebraciones
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Overlay para cerrar dropdowns */}
            {openDropdown && !isMenuOpen && (
                <div
                    className="fixed inset-0 z-30"
                    onClick={() => setOpenDropdown(null)}
                />
            )}
        </header>
    );
}
