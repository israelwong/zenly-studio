'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Bell, User, ChevronDown, LayoutDashboard, Settings } from 'lucide-react';
import { useStudioData } from '@/hooks/useStudioData';

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const params = useParams();
  const slug = params.slug as string;
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Usar hook simplificado para datos del studio
  const {
    identidadData,
    loading,
    error
  } = useStudioData({
    studioSlug: slug,
    onUpdate: (data) => {
      console.log('🎯 [NAVBAR] Updated with new studio data:', data);
    }
  });

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Función para renderizar el logo/isotipo
  const renderLogo = () => {
    if (loading) {
      return (
        <div className="w-8 h-8 bg-zinc-700 rounded-lg flex items-center justify-center animate-pulse">
          <span className="text-zinc-400 text-xs">...</span>
        </div>
      );
    }

    // Si hay isotipo, mostrarlo
    if (identidadData?.isotipo_url) {
      return (
        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
          <Image
            src={identidadData.isotipo_url}
            alt="Isotipo"
            width={32}
            height={32}
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback si falla la carga de imagen
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.classList.remove('hidden');
                fallback.classList.add('flex');
              }
            }}
          />
          <div className="w-8 h-8 bg-blue-600 rounded-lg items-center justify-center hidden">
            <span className="text-white font-bold text-sm">
              {identidadData.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      );
    }

    // Si hay logo, usar la primera letra del nombre
    if (identidadData?.logoUrl) {
      return (
        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
          <Image
            src={identidadData.logoUrl}
            alt="Logo"
            width={32}
            height={32}
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback si falla la carga de imagen
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.classList.remove('hidden');
                fallback.classList.add('flex');
              }
            }}
          />
          <div className="w-8 h-8 bg-blue-600 rounded-lg items-center justify-center hidden">
            <span className="text-white font-bold text-sm">
              {identidadData.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      );
    }

    // Fallback: usar la primera letra del nombre
    return (
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">
          {identidadData?.name?.charAt(0).toUpperCase() || 'S'}
        </span>
      </div>
    );
  };

  // Función para renderizar el nombre del studio
  const renderStudioName = () => {
    if (loading) {
      return (
        <div className="h-6 w-32 bg-zinc-700 rounded animate-pulse"></div>
      );
    }

    return (
      <h1 className="text-xl font-bold text-white">
        {identidadData?.name || 'Studio'}
      </h1>
    );
  };

  return (
    <nav className={`bg-zinc-950 border-b border-zinc-900 px-6 py-4 ${className || ''}`}>
      <div className="flex items-center justify-between">
        {/* Logo + Nombre Estudio */}
        <div className="flex items-center space-x-3">
          {renderLogo()}
          {renderStudioName()}
        </div>

        {/* Notificaciones + Usuario Menu */}
        <div className="flex items-center space-x-4">
          {/* Notificaciones */}
          <button className="relative p-2 text-zinc-400 hover:text-white transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>

          {/* Indicador de estado de datos */}
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : error ? 'bg-red-500' : 'bg-green-500'
              }`} title={
                loading
                  ? 'Cargando datos...'
                  : error
                    ? 'Error al cargar datos'
                    : 'Datos cargados correctamente'
              }></div>
          </div>

          {/* Usuario Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-2 p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <span className="text-sm">Usuario Demo</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  <Link
                    href={`/${slug}/dashboard`}
                    className="flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4 mr-3" />
                    Dashboard
                  </Link>
                  <Link
                    href={`/${slug}/configuracion/`}
                    className="flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Configurar
                  </Link>
                  <hr className="my-1 border-zinc-700" />
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
