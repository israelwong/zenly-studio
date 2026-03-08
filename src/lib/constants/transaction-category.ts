/**
 * Categorías obligatorias para studio_pagos.transaction_category (informe auditoría 2026-03-07)
 * Archivo sin "use server" para poder exportar desde archivos que solo exportan async functions.
 */
export const TRANSACTION_CATEGORY = {
  ANTICIPO: 'anticipo',
  ABONO: 'abono',
  LIQUIDACION: 'liquidacion',
  DEVOLUCION: 'devolucion',
  CANCELACION: 'cancelacion',
} as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORY)[keyof typeof TRANSACTION_CATEGORY];
