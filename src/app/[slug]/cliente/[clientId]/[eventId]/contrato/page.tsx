import { unstable_cache } from 'next/cache';
import type { Metadata } from 'next';
import { obtenerDashboardInfo } from '@/lib/actions/cliente/dashboard.actions';
import { getAllEventContractsForClient, getEventContractForClient } from '@/lib/actions/studio/business/contracts/contracts.actions';
import { getEventContractData, renderContractContent } from '@/lib/actions/studio/business/contracts/renderer.actions';
import { getContractTemplate } from '@/lib/actions/studio/business/contracts/templates.actions';
import { getClienteSession, obtenerStudioPublicInfo } from '@/lib/actions/cliente';
import EventoContratoClient from './page-client';
import type { EventContract } from '@/types/contracts';
import type { EventContractDataWithConditions } from '@/lib/actions/studio/business/contracts/renderer.actions';

interface EventoContratoPageProps {
  params: Promise<{ slug: string; clientId: string; eventId: string }>;
}

export async function generateMetadata({ params }: EventoContratoPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const studioInfo = await obtenerStudioPublicInfo(slug);

    if (!studioInfo) {
      return {
        title: 'Contrato',
        description: 'Contrato del evento',
      };
    }

    const baseTitle = studioInfo.studio_name || 'Zenly Studio';
    const title = `Contrato - ${baseTitle}`;
    const description = `Contrato del evento - ${baseTitle}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
      },
    };
  } catch (error) {
    console.error('[generateMetadata] Error:', error);
    return {
      title: 'Contrato',
      description: 'Contrato del evento',
    };
  }
}

export default async function EventoContratoPage({ params }: EventoContratoPageProps) {
  const { slug, clientId, eventId } = await params;

  // Autenticación en servidor
  const cliente = await getClienteSession();
  if (!cliente || clientId !== cliente.id) {
    return null;
  }

  // Cachear datos con tags para invalidación granular
  // ⚠️ CRÍTICO: Tags incluyen eventId y clientId para aislamiento
  const getCachedDashboard = unstable_cache(
    async () => {
      return obtenerDashboardInfo(eventId, clientId, slug);
    },
    ['cliente-dashboard', eventId, clientId, slug],
    {
      tags: [`cliente-dashboard-${eventId}-${clientId}`],
      revalidate: false,
    }
  );

  const getCachedContractData = unstable_cache(
    async () => {
      return getEventContractData(slug, eventId);
    },
    ['cliente-contract-data', eventId, slug],
    {
      tags: [`cliente-contract-data-${eventId}-${clientId}`],
      revalidate: false,
    }
  );

  // Cargar datos en paralelo
  const [dashboardResult, contractDataResult] = await Promise.all([
    getCachedDashboard(),
    getCachedContractData(),
  ]);

  // Intentar obtener contrato desde snapshot (prioridad 1)
  let initialContract: EventContract | null = null;
  let initialAllContracts: EventContract[] = [];
  let initialCancelledContracts: EventContract[] = [];
  let initialEventData: EventContractDataWithConditions | null = null;

  if (dashboardResult.success && dashboardResult.data?.contract?.content) {
    // Usar contrato inmutable desde snapshot
    const immutableContract = dashboardResult.data.contract;
    let contractContent = immutableContract.content;
    // Re-renderizar con plantilla + eventData cuando haya template_id para corregir fecha del evento (SSoT date-only)
    const templateId = immutableContract.template_id;
    if (templateId && contractDataResult.success && contractDataResult.data) {
      const templateResult = await getContractTemplate(slug, templateId);
      if (templateResult.success && templateResult.data?.content) {
        const rendered = await renderContractContent(
          templateResult.data.content,
          contractDataResult.data,
          contractDataResult.data.condicionesData
        );
        if (rendered.success && rendered.data) {
          contractContent = rendered.data;
        }
      }
    }
    initialContract = {
      id: immutableContract.id,
      content: contractContent,
      status: immutableContract.status as any,
      created_at: immutableContract.created_at,
      updated_at: immutableContract.created_at,
      signed_at: immutableContract.signed_at || undefined,
      studio_id: '',
      event_id: eventId,
      template_id: templateId || '',
      version: 1,
      created_by: undefined,
      signed_by_client: !!immutableContract.signed_at,
      client_signature_url: undefined,
      cancelled_at: undefined,
      cancellation_reason: undefined,
    } as EventContract;
    initialAllContracts = [initialContract];
    initialCancelledContracts = [];
  } else {
    // Fallback: cargar desde BD si no hay snapshot
    const allContractsResult = await getAllEventContractsForClient(slug, eventId, clientId);
    if (allContractsResult.success && allContractsResult.data) {
      initialAllContracts = allContractsResult.data;
      const activeContracts = allContractsResult.data.filter((c: EventContract) => c.status !== 'CANCELLED');
      const cancelled = allContractsResult.data.filter((c: EventContract) => c.status === 'CANCELLED');
      initialCancelledContracts = cancelled;
      initialContract = activeContracts[0] || null;
    }
  }

  // Obtener datos del evento para renderizar
  if (initialContract && contractDataResult.success && contractDataResult.data) {
    initialEventData = contractDataResult.data;
  }

  return (
    <EventoContratoClient
      initialContract={initialContract}
      initialAllContracts={initialAllContracts}
      initialCancelledContracts={initialCancelledContracts}
      initialEventData={initialEventData}
    />
  );
}
