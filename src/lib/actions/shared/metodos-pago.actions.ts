'use server';

/**
 * Funciones compartidas para métodos de pago
 * Fuente de verdad para información bancaria y métodos de pago configurados
 */

import { prisma } from '@/lib/prisma';
import type { StudioBankInfo } from '@/types/client';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Obtiene la información bancaria configurada para transferencias
 * Busca el método de pago de transferencia activo y disponible para cotizaciones
 * 
 * @param studioId - ID del estudio
 * @returns Información bancaria configurada o error si no está disponible
 */
export async function obtenerInfoBancariaTransferencia(
  studioId: string
): Promise<ApiResponse<StudioBankInfo>> {
  try {
    // Verificar que el estudio existe
    const studio = await prisma.studios.findUnique({
      where: { id: studioId },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        message: 'Estudio no encontrado',
      };
    }

    // Obtener método de pago de transferencia configurado y disponible para cotizaciones
    const metodoTransferencia = await prisma.studio_metodos_pago.findFirst({
      where: {
        studio_id: studioId,
        payment_method: { in: ['transferencia', 'spei_directo'] },
        available_for_quotes: true,
        status: 'active',
        banco: { not: null },
        beneficiario: { not: null },
        cuenta_clabe: { not: null },
      },
      orderBy: { order: 'asc' },
    });

    if (metodoTransferencia && metodoTransferencia.banco && metodoTransferencia.beneficiario && metodoTransferencia.cuenta_clabe) {
      return {
        success: true,
        data: {
          studio_id: studio.id,
          clabe: metodoTransferencia.cuenta_clabe,
          banco: metodoTransferencia.banco,
          titular: metodoTransferencia.beneficiario,
        },
      };
    }

    // Si no hay método configurado, retornar error
    return {
      success: false,
      message: 'No hay método de transferencia configurado para cotizaciones',
    };
  } catch (error) {
    console.error('[obtenerInfoBancariaTransferencia] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener información bancaria',
    };
  }
}

/**
 * Obtiene la información bancaria por slug del estudio (para uso en WhatsApp, etc.)
 */
export async function obtenerInfoBancariaTransferenciaPorSlug(
  studioSlug: string
): Promise<ApiResponse<StudioBankInfo>> {
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });
  if (!studio) {
    return { success: false, message: 'Estudio no encontrado' };
  }
  return obtenerInfoBancariaTransferencia(studio.id);
}

