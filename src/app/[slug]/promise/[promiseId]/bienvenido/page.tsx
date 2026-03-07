import React from 'react';
import { redirect } from 'next/navigation';
import { getPublicPromiseBienvenidoData } from '@/lib/actions/public/promesas.actions';
import { getEventContractData } from '@/lib/actions/studio/business/contracts/renderer.actions';
import { BienvenidoPageClient } from './BienvenidoPageClient';

export const dynamic = 'force-dynamic';

interface BienvenidoPageProps {
  params: Promise<{ slug: string; promiseId: string }>;
}

export default async function BienvenidoPage({ params }: BienvenidoPageProps) {
  const { slug, promiseId } = await params;

  const bienvenidoResult = await getPublicPromiseBienvenidoData(slug, promiseId);

  if (!bienvenidoResult.success || !bienvenidoResult.data) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  const data = bienvenidoResult.data;

  // ⚠️ RENDERIZADO DE CONTRATO: Cargar cotizacionData y condicionesData para bloques especiales
  let cotizacionData: any = undefined;
  let condicionesData: any = undefined;

  if (data.eventoId && data.contract?.template_id) {
    const contractDataResult = await getEventContractData(slug, data.eventoId);
    if (contractDataResult.success && contractDataResult.data) {
      cotizacionData = contractDataResult.data.cotizacionData;
      condicionesData = contractDataResult.data.condicionesData;
    }
  }

  return (
    <BienvenidoPageClient
      studioSlug={slug}
      promiseId={promiseId}
      contactName={data.contactName}
      nombreEstudio={data.nombreEstudio}
      nombreEvento={data.nombreEvento}
      fechaEvento={data.fechaEvento}
      categoriaEvento={data.categoriaEvento}
      archivoContratoUrl={data.archivoContratoUrl}
      initialEventoId={data.eventoId}
      cotizacionId={data.cotizacionId}
      contractId={data.contractId}
      contract={data.contract}
      cotizacionData={cotizacionData}
      condicionesData={condicionesData}
      selectedByProspect={data.selectedByProspect}
    />
  );
}
