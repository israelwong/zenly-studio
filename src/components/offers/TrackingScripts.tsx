"use client";

import { useEffect } from "react";
import Script from "next/script";

// Tipos para objetos globales de tracking
interface WindowWithDataLayer extends Window {
  dataLayer?: Array<Record<string, unknown>>;
}

interface WindowWithFbq extends Window {
  fbq?: (command: string, eventName: string, eventData?: Record<string, unknown>) => void;
}

interface TrackingScriptsProps {
  gtmId?: string | null;
  facebookPixelId?: string | null;
  zenPixelId?: string | null;
  // Eventos personalizados para ofertas
  customEvents?: {
    eventName: string;
    eventData?: Record<string, unknown>;
  }[];
}

/**
 * Componente para inyectar scripts de tracking (GTM, Facebook Pixel, Zen Pixel)
 * Se propaga automáticamente a todas las rutas públicas del estudio
 */
export function TrackingScripts({
  gtmId,
  facebookPixelId,
  zenPixelId,
  customEvents = [],
}: TrackingScriptsProps) {
  useEffect(() => {
    // Disparar eventos personalizados después de cargar los scripts
    if (customEvents.length > 0 && typeof window !== "undefined") {
      const windowWithDataLayer = window as WindowWithDataLayer;
      const windowWithFbq = window as WindowWithFbq;

      customEvents.forEach((event) => {
        // GTM event
        if (windowWithDataLayer.dataLayer) {
          windowWithDataLayer.dataLayer.push({
            event: event.eventName,
            ...event.eventData,
          });
        }

        // Facebook Pixel event
        if (windowWithFbq.fbq && facebookPixelId) {
          windowWithFbq.fbq("track", event.eventName, event.eventData);
        }
      });
    }
  }, [customEvents, facebookPixelId]);

  return (
    <>
      {/* Google Tag Manager */}
      {gtmId && (
        <>
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${gtmId}');
              `,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        </>
      )}

      {/* Facebook Pixel */}
      {facebookPixelId && (
        <Script
          id="facebook-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${facebookPixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {/* Zen Pixel (preparado para futuro) */}
      {zenPixelId && (
        <Script
          id="zen-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Zen Pixel - Preparado para implementación futura
              console.log('Zen Pixel ID: ${zenPixelId}');
            `,
          }}
        />
      )}
    </>
  );
}
