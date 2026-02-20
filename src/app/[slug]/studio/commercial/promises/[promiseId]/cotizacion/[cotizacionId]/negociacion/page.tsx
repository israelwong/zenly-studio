import { loadCotizacionParaNegociacion } from '@/lib/actions/studio/commercial/promises/negociacion.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import { obtenerCondicionesComerciales } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { NegociacionClient } from './components/NegociacionClient';
import { redirect } from 'next/navigation';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';

export type { NegociacionState } from './components/NegociacionClient';

interface NegociacionPageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
    cotizacionId: string;
  }>;
}

export default async function NegociacionPage({ params }: NegociacionPageProps) {
  const { slug: studioSlug, cotizacionId } = await params;

  // Cargar datos en paralelo
  const [cotizacionResult, configData] = await Promise.all([
    loadCotizacionParaNegociacion(cotizacionId, studioSlug),
    obtenerConfiguracionPrecios(studioSlug),
  ]);

  if (!cotizacionResult.success || !cotizacionResult.data) {
    redirect(`/${studioSlug}/studio/commercial/promises`);
  }

  const cotizacion = cotizacionResult.data;

  // Procesar configuración de precios
  const configPrecios: ConfiguracionPrecios = configData
    ? {
      utilidad_servicio: parseFloat(configData.utilidad_servicio || '0.30'),
      utilidad_producto: parseFloat(configData.utilidad_producto || '0.20'),
      comision_venta: parseFloat(configData.comision_venta || '0.10'),
      sobreprecio: parseFloat(configData.sobreprecio || '0.05'),
    }
    : {
      utilidad_servicio: 0.30,
      utilidad_producto: 0.20,
      comision_venta: 0.10,
      sobreprecio: 0.05,
    };

  // Cargar condiciones comerciales (se pasan como props iniciales, pero el componente las puede recargar)
  const condicionesResult = await obtenerCondicionesComerciales(studioSlug);
  const condicionesComerciales = condicionesResult.success && condicionesResult.data
    ? condicionesResult.data.map(cc => ({
      id: cc.id,
      name: cc.name,
      description: cc.description,
      discount_percentage: cc.discount_percentage,
      advance_percentage: cc.advance_percentage,
      advance_type: cc.advance_type,
      advance_amount: cc.advance_amount,
      metodo_pago_id: cc.condiciones_comerciales_metodo_pago?.[0]?.metodos_pago?.id || null,
    }))
    : [];

  return (
    <NegociacionClient
      initialCotizacion={cotizacion}
      initialConfigPrecios={configPrecios}
      initialCondicionesComerciales={condicionesComerciales}
    />
  );
}
