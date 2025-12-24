'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Loader2, FileText, CheckCircle2, Download } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton, ZenBadge } from '@/components/ui/zen';
import { getEventContractForClient, signEventContract } from '@/lib/actions/studio/business/contracts/contracts.actions';
import { getEventContractData, renderContractContent } from '@/lib/actions/studio/business/contracts/renderer.actions';
import { generatePDFFromElement, generateContractFilename } from '@/lib/utils/pdf-generator';
import { toast } from 'sonner';
import { formatDate } from '@/lib/actions/utils/formatting';
import type { EventContract } from '@/types/contracts';

export default function EventoContratoPage() {
  const params = useParams();
  const { cliente, isAuthenticated, isLoading: authLoading } = useClientAuth();
  const slug = params?.slug as string;
  const clientId = params?.clientId as string;
  const eventId = params?.eventId as string;

  const [contract, setContract] = useState<EventContract | null>(null);
  const [renderedContent, setRenderedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const printableRef = useRef<HTMLDivElement>(null);

  const loadContract = useCallback(async () => {
    if (!slug || !eventId || !cliente?.id) return;

    setLoading(true);
    try {
      const contractResult = await getEventContractForClient(slug, eventId, cliente.id);

      if (contractResult.success && contractResult.data) {
        setContract(contractResult.data);

        // Obtener datos del evento para renderizar
        const dataResult = await getEventContractData(slug, eventId);
        if (dataResult.success && dataResult.data) {
          setEventData(dataResult.data);

          // Renderizar contenido
          const renderResult = await renderContractContent(
            contractResult.data.content,
            dataResult.data,
            dataResult.data.condicionesData
          );
          if (renderResult.success && renderResult.data) {
            setRenderedContent(renderResult.data);
          } else {
            toast.error(renderResult.error || 'Error al renderizar el contrato');
          }
        } else {
          toast.error(dataResult.error || 'Error al obtener datos del evento');
        }
      } else {
        toast.error(contractResult.error || 'No hay contrato disponible para este evento');
      }
    } catch (error) {
      toast.error('Error al cargar el contrato');
    } finally {
      setLoading(false);
    }
  }, [slug, eventId, cliente?.id]);

  useEffect(() => {
    if (isAuthenticated && cliente?.id && eventId && slug) {
      loadContract();
    }
  }, [isAuthenticated, cliente?.id, eventId, slug, loadContract]);

  const handleSign = async () => {
    if (!contract || !slug) return;

    setIsSigning(true);
    try {
      const result = await signEventContract(slug, contract.id);

      if (result.success) {
        toast.success('Contrato firmado correctamente');
        await loadContract();
      } else {
        toast.error(result.error || 'Error al firmar contrato');
      }
    } catch (error) {
      toast.error('Error al firmar contrato');
    } finally {
      setIsSigning(false);
    }
  };

  const handleExportPDF = async () => {
    if (!eventData || !renderedContent || !printableRef.current) {
      toast.error('No hay datos del contrato disponibles');
      return;
    }

    setIsExportingPDF(true);
    try {
      const filename = generateContractFilename(
        eventData.nombre_evento || 'Contrato',
        eventData.nombre_cliente || 'Cliente'
      );

      await generatePDFFromElement(printableRef.current, {
        filename,
        margin: 0.75,
      });

      toast.success('Contrato exportado a PDF correctamente');
    } catch (error) {
      toast.error('Error al exportar PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !cliente) {
    return null;
  }

  if (loading) {
    return (
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Contrato</h1>
        <p className="text-zinc-400">Cargando contrato...</p>
        <ZenCard className="mt-6">
          <ZenCardContent className="p-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Contrato</h1>
        <p className="text-zinc-400">No hay contrato disponible para este evento</p>
        <ZenCard className="mt-6">
          <ZenCardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">
              El estudio aún no ha publicado un contrato para este evento.
            </p>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  const isSigned = contract.status === 'signed';
  const isPublished = contract.status === 'published';

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Contrato</h1>
          <p className="text-zinc-400">
            {isSigned ? 'Contrato firmado' : isPublished ? 'Revisa y firma el contrato' : 'Contrato en revisión'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSigned && (
            <ZenBadge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-950/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Firmado
            </ZenBadge>
          )}
          {isPublished && (
            <ZenBadge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-950/20">
              <FileText className="h-3 w-3 mr-1" />
              Publicado
            </ZenBadge>
          )}
        </div>
      </div>

      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-lg">
              Contrato - Versión {contract.version}
            </ZenCardTitle>
            <div className="flex items-center gap-2">
              <ZenButton
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExportingPDF}
              >
                {isExportingPDF ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Descargar PDF
              </ZenButton>
              {isPublished && !isSigned && (
                <ZenButton
                  variant="primary"
                  size="sm"
                  onClick={handleSign}
                  disabled={isSigning}
                >
                  {isSigning ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Firmar contrato
                </ZenButton>
              )}
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          {renderedContent ? (
            <>
              <style dangerouslySetInnerHTML={{
                __html: `
                .contract-preview {
                  color: rgb(161 161 170);
                  font-size: 0.875rem;
                  line-height: 1.5;
                }
                .contract-preview h1 {
                  font-size: 1.5rem !important;
                  font-weight: 700 !important;
                  line-height: 1.2 !important;
                  margin-top: 1.5rem !important;
                  margin-bottom: 1rem !important;
                  margin-left: 0 !important;
                  margin-right: 0 !important;
                  padding: 0 !important;
                  color: rgb(244, 244, 245) !important;
                  text-align: left !important;
                  text-transform: uppercase;
                }
                .contract-preview h1:first-child {
                  margin-top: 0 !important;
                }
                .contract-preview h2 {
                  font-size: 1.25rem;
                  font-weight: 600;
                  margin-top: 1rem;
                  margin-bottom: 0.5rem;
                  color: rgb(244 244 245);
                }
                .contract-preview h3 {
                  font-size: 1.125rem;
                  font-weight: 500;
                  margin-top: 0.75rem;
                  margin-bottom: 0.5rem;
                  color: rgb(212 212 216);
                }
                .contract-preview p {
                  margin-top: 0.5rem;
                  margin-bottom: 0.5rem;
                  line-height: 1.6;
                  color: rgb(161 161 170);
                }
                .contract-preview ul,
                .contract-preview ol {
                  list-style-position: outside;
                  padding-left: 1.5rem;
                  margin-top: 0.5rem;
                  margin-bottom: 0.5rem;
                  color: rgb(161 161 170);
                }
                .contract-preview ul {
                  list-style-type: disc;
                }
                .contract-preview ol {
                  list-style-type: decimal;
                }
                .contract-preview ul li,
                .contract-preview ol li {
                  margin-top: 0.25rem;
                  margin-bottom: 0.25rem;
                  padding-left: 0.5rem;
                  line-height: 1.5;
                  display: list-item;
                }
                .contract-preview strong {
                  font-weight: 600;
                  color: rgb(228 228 231);
                }
                .contract-preview em {
                  font-style: italic;
                  color: rgb(113 113 122);
                }
                .contract-preview blockquote {
                  margin: 0.5rem 0;
                  padding-left: 1rem;
                  border-left: 2px solid rgb(63 63 70);
                  color: rgb(161 161 170);
                }
              `}} />
              <div
                className="contract-preview scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
                dangerouslySetInnerHTML={{ __html: renderedContent }}
              />
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          )}

          {isSigned && contract.signed_at && (
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <p className="text-sm text-zinc-500">
                Firmado el {formatDate(contract.signed_at)}
              </p>
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      {/* Hidden Printable Version - Sin clases Tailwind para PDF */}
      {renderedContent && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <div
            ref={printableRef}
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: '32px',
              width: '210mm',
              minHeight: '297mm',
              fontFamily: 'Arial, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6'
            }}
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        </div>
      )}
    </div>
  );
}

