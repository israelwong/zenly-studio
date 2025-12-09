'use client';

import React, { useState } from 'react';
import { Phone, Globe, Mail, Hash, MapPin, Clock, ExternalLink, Edit2, Share2 } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import InstagramIcon from '@/components/ui/icons/InstagramIcon';
import FacebookIcon from '@/components/ui/icons/FacebookIcon';
import TikTokIcon from '@/components/ui/icons/TikTokIcon';
import YouTubeIcon from '@/components/ui/icons/YouTubeIcon';
import LinkedInIcon from '@/components/ui/icons/LinkedInIcon';
import ThreadsIcon from '@/components/ui/icons/ThreadsIcon';
import SpotifyIcon from '@/components/ui/icons/SpotifyIcon';
import { PublicStudioProfile, PublicContactInfo } from '@/types/public-profile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    EditPresentationModal,
    EditPhoneModal,
    EditContactInfoModal,
    EditScheduleModal,
    EditKeywordsModal,
    EditSocialNetworksModal
} from '@/components/shared/contact-modals';

interface Horario {
    dia: string;
    apertura: string;
    cierre: string;
    cerrado: boolean;
}

interface HorarioAgrupado {
    dias: string;
    horario: string;
}

interface InfoViewProps {
    studio: PublicStudioProfile;
    contactInfo: PublicContactInfo;
    socialNetworks: Array<{
        id: string;
        url: string;
        platform: {
            id: string;
            name: string;
            icon: string | null;
        } | null;
        order: number;
    }>;
    studioSlug: string;
}

interface PhoneOption {
    id: string;
    number: string;
    label: string | null;
}

/**
 * InfoView - Business information and contact details
 * Uses ZenButton and ZenCard from ZEN Design System
 * Shows contact actions, location, and social links
 */
export function ContactSection({ studio, contactInfo, socialNetworks, studioSlug }: InfoViewProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [phoneModal, setPhoneModal] = useState<{ open: boolean; phones: PhoneOption[]; action: 'call' | 'whatsapp' } | null>(null);

    // Estados para modales de edición
    const [editPresentationOpen, setEditPresentationOpen] = useState(false);
    const [editPhoneOpen, setEditPhoneOpen] = useState(false);
    const [editEmailOpen, setEditEmailOpen] = useState(false);
    const [editWebsiteOpen, setEditWebsiteOpen] = useState(false);
    const [editAddressOpen, setEditAddressOpen] = useState(false);
    const [editScheduleOpen, setEditScheduleOpen] = useState(false);
    const [editKeywordsOpen, setEditKeywordsOpen] = useState(false);
    const [editSocialNetworksOpen, setEditSocialNetworksOpen] = useState(false);

    // Verificar si el usuario es el dueño del estudio
    const isOwner = user?.id === studio.owner_id;

    // Handler para refrescar datos después de editar
    const handleDataRefresh = () => {
        router.refresh();
    };

    // Función para obtener icono de red social
    const getSocialIcon = (plataforma: string | undefined | null) => {
        if (!plataforma || typeof plataforma !== 'string') {
            return <Globe className="w-4 h-4" />;
        }

        const platform = plataforma.toLowerCase();
        switch (platform) {
            case 'instagram':
                return <InstagramIcon className="w-4 h-4" />;
            case 'facebook':
                return <FacebookIcon className="w-4 h-4" />;
            case 'tiktok':
                return <TikTokIcon className="w-4 h-4" />;
            case 'youtube':
                return <YouTubeIcon className="w-4 h-4" />;
            case 'linkedin':
                return <LinkedInIcon className="w-4 h-4" />;
            case 'threads':
                return <ThreadsIcon className="w-4 h-4" />;
            case 'spotify':
                return <SpotifyIcon className="w-4 h-4" />;
            default:
                return <Globe className="w-4 h-4" />;
        }
    };

    // Función para traducir días de la semana al español
    const traducirDia = (dia: string): string => {
        const traducciones: { [key: string]: string } = {
            'monday': 'Lunes',
            'tuesday': 'Martes',
            'wednesday': 'Miércoles',
            'thursday': 'Jueves',
            'friday': 'Viernes',
            'saturday': 'Sábado',
            'sunday': 'Domingo'
        };
        return traducciones[dia.toLowerCase()] || dia;
    };

    // Función para formatear días en rangos legibles
    const formatearDias = (dias: string[]): string => {
        if (dias.length === 0) return '';
        if (dias.length === 1) return dias[0];
        if (dias.length === 2) return dias.join(' y ');

        // Ordenar días según el orden de la semana
        const ordenDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const diasOrdenados = dias.sort((a, b) =>
            ordenDias.indexOf(a) - ordenDias.indexOf(b)
        );

        // Verificar si son días consecutivos
        const esConsecutivo = diasOrdenados.every((dia, index) => {
            if (index === 0) return true;
            const diaActual = ordenDias.indexOf(dia);
            const diaAnterior = ordenDias.indexOf(diasOrdenados[index - 1]);
            return diaActual === diaAnterior + 1;
        });

        if (esConsecutivo && diasOrdenados.length > 2) {
            return `${diasOrdenados[0]} a ${diasOrdenados[diasOrdenados.length - 1]}`;
        }

        return diasOrdenados.join(', ');
    };

    // Función para agrupar horarios por horario similar
    const agruparHorarios = (horarios: Horario[]): HorarioAgrupado[] => {
        const grupos: { [key: string]: string[] } = {};

        horarios.forEach(horario => {
            if (horario.cerrado) {
                // Agrupar días cerrados
                const key = 'Cerrado';
                if (!grupos[key]) grupos[key] = [];
                grupos[key].push(traducirDia(horario.dia));
            } else {
                // Agrupar por horario
                const key = `${horario.apertura} - ${horario.cierre}`;
                if (!grupos[key]) grupos[key] = [];
                grupos[key].push(traducirDia(horario.dia));
            }
        });

        return Object.entries(grupos).map(([horario, dias]) => ({
            dias: formatearDias(dias),
            horario
        }));
    };

    const horariosAgrupados = contactInfo.horarios && Array.isArray(contactInfo.horarios)
        ? agruparHorarios(contactInfo.horarios)
        : [];

    // Lógica de botones: 1 teléfono = acción directa, 2+ = modal
    const handleCallAction = () => {
        const callPhones = contactInfo.phones.filter(p =>
            p.is_active && (p.type === 'LLAMADAS' || p.type === 'AMBOS')
        );

        if (callPhones.length === 0) return;

        if (callPhones.length === 1) {
            // Acción directa
            window.location.href = `tel:${callPhones[0].number}`;
        } else {
            // Mostrar modal
            setPhoneModal({
                open: true,
                phones: callPhones.map(p => ({ id: p.id, number: p.number, label: p.label })),
                action: 'call'
            });
        }
    };

    const handleWhatsAppAction = () => {
        const whatsappPhones = contactInfo.phones.filter(p =>
            p.is_active && (p.type === 'WHATSAPP' || p.type === 'AMBOS')
        );

        if (whatsappPhones.length === 0) return;

        if (whatsappPhones.length === 1) {
            // Acción directa
            const cleanNumber = whatsappPhones[0].number.replace(/\D/g, '');
            window.open(`https://wa.me/${cleanNumber}`, '_blank');
        } else {
            // Mostrar modal
            setPhoneModal({
                open: true,
                phones: whatsappPhones.map(p => ({ id: p.id, number: p.number, label: p.label })),
                action: 'whatsapp'
            });
        }
    };

    const handlePhoneSelect = (phone: PhoneOption) => {
        if (phoneModal?.action === 'call') {
            window.location.href = `tel:${phone.number}`;
        } else {
            const cleanNumber = phone.number.replace(/\D/g, '');
            window.open(`https://wa.me/${cleanNumber}`, '_blank');
        }
        setPhoneModal(null);
    };

    // Temporalmente deshabilitado
    // const handleSchedule = () => {
    //     // TODO: Open scheduling modal or redirect to booking page
    //     console.log('Schedule appointment clicked');
    // };

    // Contar teléfonos disponibles por tipo
    const callPhones = contactInfo.phones.filter(p =>
        p.is_active && (p.type === 'LLAMADAS' || p.type === 'AMBOS')
    );
    const callPhonesCount = callPhones.length;

    const whatsappPhones = contactInfo.phones.filter(p =>
        p.is_active && (p.type === 'WHATSAPP' || p.type === 'AMBOS')
    );
    const whatsappPhonesCount = whatsappPhones.length;

    return (
        <div className="px-6 py-6 space-y-8">

            {/* Business Description */}
            {(studio.presentation || isOwner) && (
                <div
                    className={`relative rounded-lg p-4 -mx-4 transition-all duration-200 ${isOwner
                        ? 'hover:bg-zinc-900/30 hover:border hover:border-emerald-600/30 cursor-pointer group'
                        : ''
                        }`}
                    onClick={isOwner ? () => setEditPresentationOpen(true) : undefined}
                >
                    {studio.presentation && (
                        <p className="text-zinc-300 text-sm leading-relaxed">
                            {studio.presentation.charAt(0).toUpperCase() + studio.presentation.slice(1)}
                        </p>
                    )}
                    {!studio.presentation && isOwner && (
                        <p className="text-zinc-500 text-sm italic">
                            Agrega una descripción de tu negocio
                        </p>
                    )}
                    {isOwner && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditPresentationOpen(true);
                            }}
                            className="absolute top-2 right-2 p-2 rounded-md bg-emerald-600/10 text-emerald-400 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-emerald-600/20 hover:scale-110"
                            aria-label="Editar presentación"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}

            {/* Botones de contacto */}
            <div className="relative group">
                {/* Grid horizontal de botones */}
                {(whatsappPhonesCount > 0 || callPhonesCount > 0) && (
                    <div className={`grid gap-3 ${whatsappPhonesCount > 0 && callPhonesCount > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {/* Botón de WhatsApp */}
                        {whatsappPhonesCount > 0 && (
                            <button
                                onClick={handleWhatsAppAction}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
                            >
                                <WhatsAppIcon className="h-4.5 w-4.5" />
                                <span className="text-sm">WhatsApp</span>
                            </button>
                        )}

                        {/* Botón de llamada */}
                        {callPhonesCount > 0 && (
                            <button
                                onClick={handleCallAction}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
                            >
                                <Phone className="h-4.5 w-4.5" />
                                <span className="text-sm">Llamar</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Sin teléfonos y es owner */}
                {whatsappPhonesCount === 0 && callPhonesCount === 0 && isOwner && (
                    <div className="p-4 border border-dashed border-zinc-700 rounded-lg text-center">
                        <p className="text-sm text-zinc-500 mb-2">No has agregado números de contacto</p>
                        <ZenButton
                            variant="outline"
                            size="sm"
                            onClick={() => setEditPhoneOpen(true)}
                        >
                            <Phone className="w-4 h-4 mr-2" />
                            Agregar teléfono
                        </ZenButton>
                    </div>
                )}

                {/* Botón editar teléfonos - Desktop hover, mobile siempre visible */}
                {isOwner && (whatsappPhonesCount > 0 || callPhonesCount > 0) && (
                    <button
                        onClick={() => setEditPhoneOpen(true)}
                        className="absolute -top-2 -right-2 p-2 rounded-md bg-emerald-600/10 text-emerald-400 z-10 transition-all duration-200 hover:bg-emerald-600/20 hover:scale-110 md:opacity-0 md:group-hover:opacity-100"
                        aria-label="Editar teléfonos"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Divisor */}
            {(contactInfo.email || studio.website || contactInfo.address || horariosAgrupados.length > 0) && (
                <div className="border-t border-zinc-800/50" />
            )}

            {/* Información de contacto - Lista limpia */}
            <div className="space-y-4">
                {/* Email */}
                {(contactInfo.email || isOwner) && (
                    <div
                        className={`relative rounded-lg p-3 -mx-3 transition-all duration-200 group/item ${isOwner
                            ? 'hover:bg-zinc-900/30 hover:border hover:border-emerald-600/30'
                            : ''
                            }`}
                        onClick={isOwner && !contactInfo.email ? () => setEditEmailOpen(true) : undefined}
                    >
                        {contactInfo.email ? (
                            <a
                                href={`mailto:${contactInfo.email}`}
                                className="flex items-center gap-3"
                                onClick={(e) => isOwner && e.stopPropagation()}
                            >
                                <Mail className="w-5 h-5 text-zinc-500 transition-colors" />
                                <span className="text-sm text-zinc-300 transition-colors truncate">
                                    {contactInfo.email}
                                </span>
                            </a>
                        ) : (
                            <div className="flex items-center gap-3 cursor-pointer">
                                <Mail className="w-5 h-5 text-zinc-600" />
                                <span className="text-sm text-zinc-500 italic">
                                    Agrega un correo electrónico
                                </span>
                            </div>
                        )}
                        {isOwner && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditEmailOpen(true);
                                }}
                                className="absolute top-1/2 -translate-y-1/2 right-1 p-2 rounded-md bg-emerald-600/10 text-emerald-400 opacity-0 group-hover/item:opacity-100 md:group-hover/item:opacity-100 transition-all duration-200 hover:bg-emerald-600/20 hover:scale-110"
                                aria-label="Editar email"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Website */}
                {(studio.website || isOwner) && (
                    <div
                        className={`relative rounded-lg p-3 -mx-3 transition-all duration-200 group/item ${isOwner
                            ? 'hover:bg-zinc-900/30 hover:border hover:border-emerald-600/30'
                            : ''
                            }`}
                        onClick={isOwner && !studio.website ? () => setEditWebsiteOpen(true) : undefined}
                    >
                        {studio.website ? (
                            <a
                                href={studio.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3"
                                onClick={(e) => isOwner && e.stopPropagation()}
                            >
                                <Globe className="w-5 h-5 text-zinc-500 transition-colors" />
                                <span className="text-sm text-zinc-300 transition-colors truncate">
                                    {studio.website?.replace(/^https?:\/\//, '') ?? studio.website}
                                </span>
                            </a>
                        ) : (
                            <div className="flex items-center gap-3 cursor-pointer">
                                <Globe className="w-5 h-5 text-zinc-600" />
                                <span className="text-sm text-zinc-500 italic">
                                    Agrega tu sitio web
                                </span>
                            </div>
                        )}
                        {isOwner && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditWebsiteOpen(true);
                                }}
                                className="absolute top-1/2 -translate-y-1/2 right-1 p-2 rounded-md bg-emerald-600/10 text-emerald-400 opacity-0 group-hover/item:opacity-100 md:group-hover/item:opacity-100 transition-all duration-200 hover:bg-emerald-600/20 hover:scale-110"
                                aria-label="Editar sitio web"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Dirección */}
                {(contactInfo.address || isOwner) && (
                    <div
                        className={`relative rounded-lg p-3 -mx-3 transition-all duration-200 group/item ${isOwner
                            ? 'hover:bg-zinc-900/30 hover:border hover:border-emerald-600/30'
                            : ''
                            }`}
                        onClick={isOwner && !contactInfo.address ? () => setEditAddressOpen(true) : undefined}
                    >
                        {contactInfo.address ? (
                            <div className="space-y-2">
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-zinc-300 leading-relaxed">
                                        {contactInfo.address}
                                    </p>
                                </div>
                                {contactInfo.maps_url && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(contactInfo.maps_url!, '_blank');
                                        }}
                                        className="ml-8 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Abrir en Google Maps</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 cursor-pointer">
                                <MapPin className="w-5 h-5 text-zinc-600" />
                                <span className="text-sm text-zinc-500 italic">
                                    Agrega tu dirección
                                </span>
                            </div>
                        )}
                        {isOwner && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditAddressOpen(true);
                                }}
                                className="absolute top-1 right-1 p-2 rounded-md bg-emerald-600/10 text-emerald-400 opacity-0 group-hover/item:opacity-100 md:group-hover/item:opacity-100 transition-all duration-200 hover:bg-emerald-600/20 hover:scale-110"
                                aria-label="Editar dirección"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Horarios */}
                {(horariosAgrupados.length > 0 || isOwner) && (
                    <div
                        className={`relative rounded-lg p-3 -mx-3 transition-all duration-200 group/item ${isOwner
                            ? 'hover:bg-zinc-900/30 hover:border hover:border-emerald-600/30'
                            : ''
                            }`}
                        onClick={isOwner && horariosAgrupados.length === 0 ? () => setEditScheduleOpen(true) : undefined}
                    >
                        {horariosAgrupados.length > 0 ? (
                            <div className="space-y-2">
                                <div className="flex items-start gap-3">
                                    <Clock className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                                    <div className="flex-1 space-y-2.5">
                                        {horariosAgrupados.map((grupo, index) => (
                                            <div key={index} className="flex items-center gap-3">
                                                <div className="shrink-0 w-2 h-2 rounded-full bg-emerald-500/50" />
                                                <div className="flex-1 flex items-baseline justify-between gap-3">
                                                    <span className="text-sm text-zinc-200 font-medium">
                                                        {grupo.dias}
                                                    </span>
                                                    <span className="text-sm text-zinc-400 tabular-nums">
                                                        {grupo.horario}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : isOwner ? (
                            <div className="flex items-center gap-3 cursor-pointer">
                                <Clock className="w-5 h-5 text-zinc-600" />
                                <span className="text-sm text-zinc-500 italic">
                                    Agrega tus horarios de atención
                                </span>
                            </div>
                        ) : null}
                        {isOwner && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditScheduleOpen(true);
                                }}
                                className="absolute top-1 right-1 p-2 rounded-md bg-emerald-600/10 text-emerald-400 opacity-0 group-hover/item:opacity-100 md:group-hover/item:opacity-100 transition-all duration-200 hover:bg-emerald-600/20 hover:scale-110"
                                aria-label="Editar horarios"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Palabras clave - Sin etiqueta, solo hashtags */}
            {(studio.keywords || isOwner) && (
                <>
                    <div className="border-t border-zinc-800/50" />
                    <div
                        className={`relative rounded-lg p-3 -mx-3 transition-all duration-200 group/item ${isOwner
                            ? 'hover:bg-zinc-900/30 hover:border hover:border-emerald-600/30'
                            : ''
                            }`}
                        onClick={isOwner && !studio.keywords ? () => setEditKeywordsOpen(true) : undefined}
                    >
                        {studio.keywords ? (
                            <div className="flex items-center gap-3">
                                <Hash className="w-5 h-5 text-zinc-500 shrink-0" />
                                <div className="flex flex-wrap gap-2">
                                    {(() => {
                                        let keywordsArray: string[] = [];

                                        if (Array.isArray(studio.keywords)) {
                                            keywordsArray = studio.keywords;
                                        } else if (typeof studio.keywords === 'string') {
                                            // Try to parse as JSON first
                                            try {
                                                const parsed = JSON.parse(studio.keywords);
                                                keywordsArray = Array.isArray(parsed) ? parsed : [studio.keywords];
                                            } catch {
                                                // If not JSON, split by comma
                                                keywordsArray = studio.keywords.split(',').map(k => k.trim()).filter(k => k);
                                            }
                                        }

                                        return keywordsArray.map((palabra: string, index: number) => (
                                            <span
                                                key={index}
                                                className="text-xs text-zinc-400"
                                            >
                                                #{palabra.trim()}
                                            </span>
                                        ));
                                    })()}
                                </div>
                            </div>
                        ) : isOwner ? (
                            <div className="flex items-center gap-3 cursor-pointer">
                                <Hash className="w-5 h-5 text-zinc-600" />
                                <span className="text-sm text-zinc-500 italic">
                                    Agrega palabras clave para SEO
                                </span>
                            </div>
                        ) : null}
                        {isOwner && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditKeywordsOpen(true);
                                }}
                                className="absolute top-1/2 -translate-y-1/2 right-1 p-2 rounded-md bg-emerald-600/10 text-emerald-400 opacity-0 group-hover/item:opacity-100 md:group-hover/item:opacity-100 transition-all duration-200 hover:bg-emerald-600/20 hover:scale-110"
                                aria-label="Editar palabras clave"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* Redes sociales */}
            {(socialNetworks.length > 0 || isOwner) && (
                <>
                    <div className="border-t border-zinc-800/50" />
                    <div
                        className={`relative rounded-lg p-3 -mx-3 transition-all duration-200 group/item ${isOwner
                            ? 'hover:bg-zinc-900/30 hover:border hover:border-emerald-600/30'
                            : ''
                            }`}
                        onClick={isOwner && socialNetworks.length === 0 ? () => setEditSocialNetworksOpen(true) : undefined}
                    >
                        {socialNetworks.length > 0 ? (
                            <div className="flex items-start gap-3">
                                <Share2 className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                                <div className="flex flex-wrap gap-3">
                                    {socialNetworks.map((network) => {
                                        const platformName = network.platform?.name?.toLowerCase() || '';

                                        return (
                                            <a
                                                key={network.id}
                                                href={network.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all duration-200 hover:scale-105"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {platformName.includes('instagram') && <InstagramIcon className="w-4 h-4 text-zinc-400" />}
                                                {platformName.includes('facebook') && <FacebookIcon className="w-4 h-4 text-zinc-400" />}
                                                {platformName.includes('tiktok') && <TikTokIcon className="w-4 h-4 text-zinc-400" />}
                                                {platformName.includes('youtube') && <YouTubeIcon className="w-4 h-4 text-zinc-400" />}
                                                {platformName.includes('linkedin') && <LinkedInIcon className="w-4 h-4 text-zinc-400" />}
                                                {platformName.includes('threads') && <ThreadsIcon className="w-4 h-4 text-zinc-400" />}
                                                {platformName.includes('spotify') && <SpotifyIcon className="w-4 h-4 text-zinc-400" />}
                                                <span className="text-sm text-zinc-300">
                                                    {network.platform?.name || 'Red social'}
                                                </span>
                                                <ExternalLink className="w-3 h-3 text-zinc-500" />
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : isOwner ? (
                            <div className="flex items-center gap-3 cursor-pointer">
                                <Share2 className="w-5 h-5 text-zinc-600" />
                                <span className="text-sm text-zinc-500 italic">
                                    Agrega tus redes sociales
                                </span>
                            </div>
                        ) : null}
                        {isOwner && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditSocialNetworksOpen(true);
                                }}
                                className="absolute top-1/2 -translate-y-1/2 right-1 p-2 rounded-md bg-emerald-600/10 text-emerald-400 opacity-0 group-hover/item:opacity-100 md:group-hover/item:opacity-100 transition-all duration-200 hover:bg-emerald-600/20 hover:scale-110"
                                aria-label="Editar redes sociales"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* Modal de selección de teléfono */}
            <Dialog open={phoneModal?.open || false} onOpenChange={() => setPhoneModal(null)}>
                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-zinc-100">
                            {phoneModal?.action === 'call' ? (
                                <>
                                    <Phone className="h-5 w-5 text-blue-400" />
                                    Selecciona un teléfono
                                </>
                            ) : (
                                <>
                                    <WhatsAppIcon className="h-5 w-5 text-green-400" />
                                    Selecciona un WhatsApp
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 mt-4">
                        {phoneModal?.phones.map((phone) => (
                            <button
                                key={phone.id}
                                onClick={() => handlePhoneSelect(phone)}
                                className="w-full p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors text-left"
                            >
                                {phone.label && (
                                    <span className="text-sm text-zinc-400 block mb-1">
                                        {phone.label}
                                    </span>
                                )}
                                <span className="text-white font-medium text-lg">
                                    {phone.number}
                                </span>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modales de edición - Solo si es owner */}
            {isOwner && (
                <>
                    <EditPresentationModal
                        isOpen={editPresentationOpen}
                        onClose={() => setEditPresentationOpen(false)}
                        studioSlug={studioSlug}
                        currentValue={studio.presentation}
                        onSuccess={handleDataRefresh}
                    />

                    <EditPhoneModal
                        isOpen={editPhoneOpen}
                        onClose={() => setEditPhoneOpen(false)}
                        studioSlug={studioSlug}
                        phone={contactInfo.phones?.[0] ? {
                            id: contactInfo.phones[0].id,
                            number: contactInfo.phones[0].number,
                            label: contactInfo.phones[0].label,
                            type: contactInfo.phones[0].type as 'LLAMADAS' | 'AMBOS' | 'WHATSAPP'
                        } : undefined}
                        onSuccess={handleDataRefresh}
                    />

                    <EditContactInfoModal
                        isOpen={editEmailOpen}
                        onClose={() => setEditEmailOpen(false)}
                        studioSlug={studioSlug}
                        type="email"
                        currentValue={contactInfo.email ?? null}
                        onSuccess={handleDataRefresh}
                    />

                    <EditContactInfoModal
                        isOpen={editWebsiteOpen}
                        onClose={() => setEditWebsiteOpen(false)}
                        studioSlug={studioSlug}
                        type="website"
                        currentValue={studio.website ?? null}
                        onSuccess={handleDataRefresh}
                    />

                    <EditContactInfoModal
                        isOpen={editAddressOpen}
                        onClose={() => setEditAddressOpen(false)}
                        studioSlug={studioSlug}
                        type="address"
                        currentValue={contactInfo.address ?? null}
                        googleMapsUrl={contactInfo.maps_url ?? null}
                        onSuccess={handleDataRefresh}
                    />

                    <EditScheduleModal
                        isOpen={editScheduleOpen}
                        onClose={() => setEditScheduleOpen(false)}
                        studioSlug={studioSlug}
                        horarios={contactInfo.horarios || []}
                        onSuccess={handleDataRefresh}
                    />

                    <EditKeywordsModal
                        isOpen={editKeywordsOpen}
                        onClose={() => setEditKeywordsOpen(false)}
                        studioSlug={studioSlug}
                        currentValue={studio.keywords}
                        onSuccess={handleDataRefresh}
                    />

                    <EditSocialNetworksModal
                        isOpen={editSocialNetworksOpen}
                        onClose={() => setEditSocialNetworksOpen(false)}
                        studioSlug={studioSlug}
                        onSuccess={handleDataRefresh}
                    />
                </>
            )}
        </div>
    );
}
