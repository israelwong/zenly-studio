'use client';

import { createContext, useContext, ReactNode, useState, useRef, useCallback, useMemo } from 'react';

type ProgressStep = 'validating' | 'sending' | 'registering' | 'collecting' | 'generating_contract' | 'preparing' | 'completed' | 'error';

interface AuthorizationData {
  promiseId: string;
  cotizacionId: string;
  studioSlug: string;
  formData: {
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    contact_address: string;
    event_name: string;
    event_location: string;
  };
  condicionesComercialesId?: string | null;
  condicionesComercialesMetodoPagoId?: string | null;
  autoGenerateContract: boolean;
  /** Fase 29.2: true cuando la cotización ya está en cierre (pago confirmado); solo actualizar datos y redirigir, sin autorizarCotizacionPublica */
  isModoCierre?: boolean;
}

interface PromisePageContextValue {
  onPreparing?: () => void;
  setOnPreparing: (callback: (() => void) | undefined) => void;
  onSuccess?: () => void;
  setOnSuccess: (callback: (() => void) | undefined) => void;
  showProgressOverlay: boolean;
  setShowProgressOverlay: (show: boolean) => void;
  progressStep: ProgressStep;
  setProgressStep: (step: ProgressStep) => void;
  progressError: string | null;
  setProgressError: (error: string | null) => void;
  autoGenerateContract: boolean;
  setAutoGenerateContract: (value: boolean) => void;
  isAuthorizationInProgress: boolean;
  setIsAuthorizationInProgress: (value: boolean) => void;
  authorizationData: AuthorizationData | null;
  setAuthorizationData: (data: AuthorizationData | null) => void;
}

const PromisePageContext = createContext<PromisePageContextValue>({
  setOnPreparing: () => {},
  setOnSuccess: () => {},
  showProgressOverlay: false,
  setShowProgressOverlay: () => {},
  progressStep: 'validating',
  setProgressStep: () => {},
  progressError: null,
  setProgressError: () => {},
  autoGenerateContract: false,
  setAutoGenerateContract: () => {},
  isAuthorizationInProgress: false,
  setIsAuthorizationInProgress: () => {},
  authorizationData: null,
  setAuthorizationData: () => {},
});

export function PromisePageProvider({
  children,
  onPreparing: initialOnPreparing,
  onSuccess: initialOnSuccess,
}: {
  children: ReactNode;
  onPreparing?: () => void;
  onSuccess?: () => void;
}) {
  const [showProgressOverlay, setShowProgressOverlay] = useState(false);
  const [progressStep, setProgressStep] = useState<ProgressStep>('validating');
  const [progressError, setProgressError] = useState<string | null>(null);
  const [autoGenerateContract, setAutoGenerateContract] = useState(false);
  const [isAuthorizationInProgress, setIsAuthorizationInProgress] = useState(false);
  const [authorizationData, setAuthorizationData] = useState<AuthorizationData | null>(null);
  const onPreparingRef = useRef<(() => void) | undefined>(initialOnPreparing);
  const onSuccessRef = useRef<(() => void) | undefined>(initialOnSuccess);

  // Función estable que siempre llama al callback actual del ref
  const onPreparing = useCallback(() => {
    onPreparingRef.current?.();
  }, []);

  const setOnPreparing = useCallback((callback: (() => void) | undefined) => {
    onPreparingRef.current = callback;
  }, []);

  const onSuccess = useCallback(() => {
    onSuccessRef.current?.();
  }, []);

  const setOnSuccess = useCallback((callback: (() => void) | undefined) => {
    onSuccessRef.current = callback;
  }, []);

  // Memoizar el valor del contexto para evitar re-renders innecesarios
  const contextValue = useMemo(() => ({
    onPreparing,
    setOnPreparing,
    onSuccess,
    setOnSuccess,
    showProgressOverlay,
    setShowProgressOverlay,
    progressStep,
    setProgressStep,
    progressError,
    setProgressError,
    autoGenerateContract,
    setAutoGenerateContract,
    isAuthorizationInProgress,
    setIsAuthorizationInProgress,
    authorizationData,
    setAuthorizationData,
  }), [
    onPreparing,
    setOnPreparing,
    onSuccess,
    setOnSuccess,
    showProgressOverlay,
    progressStep,
    progressError,
    autoGenerateContract,
    isAuthorizationInProgress,
    authorizationData,
  ]);

  return (
    <PromisePageContext.Provider value={contextValue}>
      {children}
    </PromisePageContext.Provider>
  );
}

export function usePromisePageContext() {
  return useContext(PromisePageContext);
}

