'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { Plus, FileText, ArrowRight, CheckCircle, Link2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenBadge, ZenInput } from '@/components/ui/zen';
import { crearCotizacionAnexo, autorizarAnexoManualmente, setAnexoVisibleToClient } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { getPublicAnnexPath } from '@/lib/utils/public-promise-routing';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { toast } from 'sonner';

interface AnexosPageClientProps {
  studioSlug: string;
  promiseId: string;
  initialAnexos: CotizacionListItem[];
}

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_cierre: 'En cierre',
  autorizada: 'Autorizada',
  aprobada: 'Aprobada',
  cancelada: 'Cancelada',
};

export function AnexosPageClient({
  studioSlug,
  promiseId,
  initialAnexos,
}: AnexosPageClientProps) {
  const router = useRouter();
  const [anexos, setAnexos] = useState(initialAnexos);
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [authorizingId, setAuthorizingId] = useState<string | null>(null);

  const handleCopiarUrl = async (annexId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const path = getPublicAnnexPath(studioSlug, promiseId, annexId);
    const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
    const visible = await setAnexoVisibleToClient(studioSlug, promiseId, annexId);
    if (!visible.success) {
      toast.error(visible.error ?? 'No se pudo habilitar la URL');
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => toast.success('URL copiada. El cliente ya puede ver esta propuesta.'),
      () => toast.error('No se pudo copiar')
    );
  };

  const handleAutorizarManualmente = async (annexId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAuthorizingId(annexId);
    try {
      const result = await autorizarAnexoManualmente(studioSlug, annexId);
      if (result.success) {
        toast.success('Anexo autorizado');
        startTransition(() => router.refresh());
        setAnexos((prev) =>
          prev.map((a) => (a.id === annexId ? { ...a, status: 'autorizada' } : a))
        );
      } else {
        toast.error(result.error ?? 'Error al autorizar');
      }
    } finally {
      setAuthorizingId(null);
    }
  };

  const handleCrear = async () => {
    const nameTrim = nombre.trim();
    if (!nameTrim) {
      toast.error('Escribe un nombre para la propuesta adicional');
      return;
    }
    setIsCreating(true);
    try {
      const result = await crearCotizacionAnexo(studioSlug, promiseId, {
        nombre: nameTrim,
        descripcion: descripcion.trim() || null,
      });
      if (result.success && result.data) {
        toast.success('Propuesta adicional creada');
        setShowForm(false);
        setNombre('');
        setDescripcion('');
        startTransition(() => router.refresh());
        router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${result.data!.id}`);
      } else {
        toast.error(result.error ?? 'Error al crear');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const basePath = `/${studioSlug}/studio/commercial/promises/${promiseId}`;

  return (
    <div className="space-y-6">
      <ZenCard>
        <ZenCardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <ZenCardTitle>Propuestas adicionales (Anexos)</ZenCardTitle>
            <ZenCardDescription>
              Cotizaciones de upselling vinculadas a la cotización principal autorizada. Puedes crear nuevas y editarlas mientras no estén autorizadas.
            </ZenCardDescription>
          </div>
          {!showForm && (
            <ZenButton
              variant="primary"
              onClick={() => setShowForm(true)}
              className="shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear nueva propuesta adicional
            </ZenButton>
          )}
        </ZenCardHeader>
        {showForm && (
          <ZenCardContent className="border-t border-zinc-800 pt-4 space-y-3">
            <ZenInput
              label="Nombre de la propuesta"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Album adicional, Video highlight"
            />
            <ZenInput
              label="Descripción (opcional)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Breve descripción"
            />
            <div className="flex gap-2">
              <ZenButton
                variant="primary"
                onClick={handleCrear}
                disabled={isCreating}
              >
                {isCreating ? 'Creando...' : 'Crear y editar ítems'}
              </ZenButton>
              <ZenButton
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setNombre('');
                  setDescripcion('');
                }}
                disabled={isCreating}
              >
                Cancelar
              </ZenButton>
            </div>
          </ZenCardContent>
        )}
      </ZenCard>

      {anexos.length === 0 && !showForm ? (
        <ZenCard>
          <ZenCardContent className="py-12 text-center text-zinc-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No hay propuestas adicionales</p>
            <p className="text-sm mt-1">Crea una para ofrecer servicios extra a tu cliente.</p>
            <ZenButton
              variant="primary"
              className="mt-4"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear nueva propuesta adicional
            </ZenButton>
          </ZenCardContent>
        </ZenCard>
      ) : (
        <ul className="space-y-3">
          {anexos.map((anexo) => {
            const canAutorizar =
              anexo.status !== 'autorizada' &&
              anexo.status !== 'aprobada' &&
              anexo.status !== 'approved' &&
              anexo.status !== 'cancelada';
            return (
              <li key={anexo.id}>
                <ZenCard className="hover:border-zinc-600 transition-colors">
                  <ZenCardContent className="py-4 flex flex-row items-center justify-between gap-4">
                    <Link href={`${basePath}/cotizacion/${anexo.id}`} className="min-w-0 flex-1 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-zinc-200 truncate">{anexo.name}</p>
                        <div className="text-sm text-zinc-500 mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-1">
                          <span>${Number(anexo.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                          <span aria-hidden>·</span>
                          <ZenBadge variant="secondary" className="text-xs">
                            {STATUS_LABELS[anexo.status] ?? anexo.status}
                          </ZenBadge>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-500 shrink-0" />
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleCopiarUrl(anexo.id, e)}
                        title="Copiar URL para el cliente"
                        className="shrink-0"
                      >
                        <Link2 className="w-4 h-4 mr-1" />
                        Copiar URL
                      </ZenButton>
                      {canAutorizar && (
                        <ZenButton
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleAutorizarManualmente(anexo.id, e)}
                          disabled={authorizingId === anexo.id}
                          className="shrink-0"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {authorizingId === anexo.id ? 'Autorizando...' : 'Autorizar manualmente'}
                        </ZenButton>
                      )}
                    </div>
                  </ZenCardContent>
                </ZenCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
