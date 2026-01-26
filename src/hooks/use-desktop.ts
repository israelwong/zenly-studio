import * as React from "react"

const DESKTOP_BREAKPOINT = 1024 // lg breakpoint de Tailwind

/**
 * Hook para detectar si estamos en desktop (>= 1024px)
 * Acepta valor inicial del servidor para evitar flash de contenido
 */
export function useIsDesktop(initialValue?: boolean) {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() => {
    // Si hay valor inicial del servidor, usarlo (evita flash)
    if (initialValue !== undefined) {
      return initialValue;
    }
    // Inicializar con el valor correcto si estamos en el cliente
    if (typeof window !== 'undefined') {
      return window.innerWidth >= DESKTOP_BREAKPOINT;
    }
    // En el servidor, asumir mobile por defecto (más común)
    return false;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
    const onChange = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Verificar inmediatamente para corregir si el valor inicial del servidor no coincide con el viewport real
    setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [initialValue])

  return isDesktop
}
