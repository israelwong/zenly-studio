'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Phone, Mail } from 'lucide-react';
import Image from 'next/image';
import { ZenCard, ZenInput, ZenButton } from '@/components/ui/zen';
import { useToast } from '@/hooks/useToast';
import { useFavicon } from '@/hooks/useFavicon';
import { loginCliente, obtenerStudioPublicInfo, getClienteSession } from '@/lib/actions/cliente';
import { ToastContainer } from '@/components/client';
import { LoginSkeleton } from '../components/LoginSkeleton';
import { PublicPageFooter } from '@/components/shared/PublicPageFooter';
import { PublicPageHeader } from '@/components/shared/PublicPageHeader';
import type { StudioPublicInfo } from '@/lib/actions/cliente';

export default function ClientLoginPage() {
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [rememberSession, setRememberSession] = useState(false);
  const [studioInfo, setStudioInfo] = useState<StudioPublicInfo | null>(null);
  const { toasts, removeToast, error: showError, success } = useToast();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;

  // Actualizar favicon dinámicamente
  useFavicon(studioInfo?.isotipo_url || studioInfo?.logo_url, studioInfo?.studio_name);

  // Verificar sesión activa al montar
  useEffect(() => {
    const checkSession = async () => {
      if (slug) {
        const session = await getClienteSession();
        if (session) {
          // Si hay sesión activa, redirigir automáticamente al clientId
          router.push(`/${slug}/cliente/${session.id}`);
        } else {
          setIsCheckingSession(false);
        }
      }
    };
    checkSession();
  }, [slug, router]);

  useEffect(() => {
    const fetchStudioInfo = async () => {
      if (slug) {
        const info = await obtenerStudioPublicInfo(slug);
        setStudioInfo(info);
      }
    };
    fetchStudioInfo();
  }, [slug]);

  // Prellenar teléfono desde query params
  useEffect(() => {
    const phoneParam = searchParams.get('phone');
    if (phoneParam) {
      // Limpiar número (solo dígitos)
      const cleanPhone = phoneParam.replace(/\D/g, '').slice(0, 10);
      if (cleanPhone) {
        setPhone(cleanPhone);
        setLoginMethod('phone');
      }
    }
  }, [searchParams]);

  // Validar email formato
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Permitir vacío
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validar teléfono (solo dígitos, máximo 10)
  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Permitir vacío
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
  };

  // Manejar cambio en teléfono
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Solo permitir dígitos
    const digitsOnly = value.replace(/\D/g, '');
    // Limitar a 10 dígitos
    const limitedValue = digitsOnly.slice(0, 10);
    setPhone(limitedValue);

    // Validar y mostrar error
    if (limitedValue && !validatePhone(limitedValue)) {
      setPhoneError('Debe tener exactamente 10 dígitos');
    } else {
      setPhoneError('');
    }
  };

  // Manejar cambio en email
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    // Validar y mostrar error
    if (value && !validateEmail(value)) {
      setEmailError('Formato de email inválido');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validar según método seleccionado
    if (loginMethod === 'phone') {
      if (!phone) {
        showError('Debes proporcionar un teléfono');
        setIsLoading(false);
        return;
      }
      if (!validatePhone(phone)) {
        showError('El teléfono debe tener exactamente 10 dígitos');
        setIsLoading(false);
        return;
      }
    } else {
      if (!email) {
        showError('Debes proporcionar un email');
        setIsLoading(false);
        return;
      }
      if (!validateEmail(email)) {
        showError('El formato del email es inválido');
        setIsLoading(false);
        return;
      }
    }

    try {
      const result = await loginCliente({
        phone: loginMethod === 'phone' ? phone : undefined,
        email: loginMethod === 'email' ? email : undefined,
        studioSlug: slug,
        rememberSession,
      });

      if (result.success && result.data) {
        success('¡Bienvenido! Redirigiendo...');
        setTimeout(() => {
          router.push(`/${slug}/cliente/${result.data.id}`);
        }, 1000);
      } else {
        showError(result.message || 'Error al iniciar sesión');
        setIsLoading(false);
      }
    } catch (err) {
      showError('Error de conexión. Por favor intenta de nuevo.');
      setIsLoading(false);
    }
  };

  // Mostrar skeleton mientras verifica sesión
  if (isCheckingSession) {
    return <LoginSkeleton />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header flotante */}
      <PublicPageHeader
        studioSlug={slug}
        studioName={studioInfo?.studio_name}
        subtitle="Portal de Cliente"
        logoUrl={studioInfo?.logo_url}
        showProfileButton={true}
      />

      {/* Content centrado */}
      <main className="flex items-center justify-center p-4 pt-28">
        <div className="w-full max-w-md space-y-6">
          <ZenCard>
            {/* Card Header */}
            <div className="border-b border-zinc-800 px-6 py-4">
              <div className="flex items-center justify-center gap-2">
                <LogIn className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-semibold text-zinc-100">Acceso a Portal del Cliente</h2>
              </div>
            </div>

            {/* Card Content - Formulario */}
            <div className="p-6 space-y-6">
              <p className="text-sm text-zinc-400 text-center">
                Ingresa con tu teléfono o email para ver tus eventos contratados
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Selector de método */}
                <div className="flex gap-2 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('phone')}
                    disabled={isLoading}
                    className={`
                      flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md
                      text-sm font-medium transition-colors
                      ${loginMethod === 'phone'
                        ? 'bg-emerald-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-300'
                      }
                      ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                    `}
                  >
                    <Phone className="h-4 w-4" />
                    Teléfono
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('email')}
                    disabled={isLoading}
                    className={`
                      flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md
                      text-sm font-medium transition-colors
                      ${loginMethod === 'email'
                        ? 'bg-emerald-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-300'
                      }
                      ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                    `}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </button>
                </div>

                {/* Input condicional según método */}
                {loginMethod === 'phone' ? (
                  <div>
                    <ZenInput
                      label="Teléfono"
                      type="tel"
                      placeholder="5512345678"
                      value={phone}
                      onChange={handlePhoneChange}
                      disabled={isLoading}
                      error={phoneError}
                    />
                    {phone && phone.length < 10 && !phoneError && (
                      <p className="text-xs text-zinc-500 mt-1">
                        {phone.length}/10 dígitos
                      </p>
                    )}
                  </div>
                ) : (
                  <ZenInput
                    label="Email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={handleEmailChange}
                    disabled={isLoading}
                    error={emailError}
                  />
                )}

                {/* Switch Recordar Sesión */}
                <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg border border-zinc-800">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-300">Recordar sesión</span>
                    <span className="text-xs text-zinc-500">Mantener sesión activa por 30 días</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRememberSession(!rememberSession)}
                    disabled={isLoading}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      ${rememberSession ? 'bg-emerald-600' : 'bg-zinc-700'}
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${rememberSession ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </div>

                <ZenButton
                  type="submit"
                  className="w-full"
                  disabled={
                    isLoading ||
                    (loginMethod === 'phone' && (!phone || !!phoneError || phone.length < 10)) ||
                    (loginMethod === 'email' && (!email || !!emailError))
                  }
                  loading={isLoading}
                >
                  {isLoading ? 'Ingresando...' : 'Ingresar'}
                </ZenButton>
              </form>
            </div>

            {/* Card Footer */}
            <div className="border-t border-zinc-800 px-6 py-4 bg-zinc-900/30">
              <p className="text-xs text-zinc-500 text-center">
                Solo clientes con eventos contratados en{' '}
                <span className="text-zinc-400 font-medium">
                  {studioInfo?.studio_name || 'este studio'}
                </span>
                {' '}pueden ingresar al portal de cliente
              </p>
            </div>
          </ZenCard>

          {/* Footer by Zen - pegado al card */}
          <PublicPageFooter />
        </div>
      </main>
    </div>
  );
}
