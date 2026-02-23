/**
 * Logger de auditoría para el motor de precios.
 * Genera un log detallado en consola para comparar contra hoja de cálculo.
 * Usar solo en desarrollo (NODE_ENV === 'development') o detrás de feature flag.
 *
 * @see .cursor/docs/audit/audit-motor-precios-utilidades.md
 * @see .cursor/docs/audit/protocolo-auditoria-precios.md
 */

const PREFIX = '[AUDIT PRECIOS]';
const R = (n: number) => Number(n.toFixed(2));

export interface ItemAuditRow {
  id: string;
  nombre: string;
  costo: number;
  gasto: number;
  cantidadEfectiva: number;
  precioUnitario: number;
  esCortesia: boolean;
}

export interface AuditPreciosPayload {
  config: {
    utilidad_servicio: number;
    utilidad_producto: number;
    comision_venta: number;
    sobreprecio?: number;
  };
  items: ItemAuditRow[];
  subtotal: number;
  montoCortesias: number;
  bono: number;
  subtotalProyectado: number;
  precioCobrar: number;
  totalCosto: number;
  totalGasto: number;
  comisionRatio: number;
  montoComision: number;
  utilidadNeta: number;
}

export function logAuditoriaCotizacion(payload: AuditPreciosPayload): void {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'development') return;

  const {
    config,
    items,
    subtotal,
    montoCortesias,
    bono,
    subtotalProyectado,
    precioCobrar,
    totalCosto,
    totalGasto,
    comisionRatio,
    montoComision,
    utilidadNeta,
  } = payload;

  console.group(`${PREFIX} === INICIO AUDITORÍA ===`);
  console.log(`${PREFIX} Config: utilidad_servicio=${config.utilidad_servicio}, utilidad_producto=${config.utilidad_producto}, comision_venta=${config.comision_venta}, sobreprecio=${config.sobreprecio ?? 'N/A'}`);
  console.log(`${PREFIX} Comisión ratio (normalizado): ${comisionRatio}`);

  console.group(`${PREFIX} Ítems (costo + gasto → precio unit. → subtotal, cortesía)`);
  items.forEach((item, i) => {
    const subtotalItem = item.precioUnitario * item.cantidadEfectiva;
    console.log(
      `${PREFIX}   ${i + 1}. ${item.nombre} | id=${item.id} | costo=${R(item.costo)} | gasto=${R(item.gasto)} | cantEff=${item.cantidadEfectiva} | precioUnit=${R(item.precioUnitario)} | subtotal=${R(subtotalItem)} | cortesía=${item.esCortesia ? 'SÍ' : 'No'}`
    );
  });
  console.groupEnd();

  console.log(`${PREFIX} --- Agregados ---`);
  console.log(`${PREFIX} Subtotal (sin ajustes): ${R(subtotal)}`);
  console.log(`${PREFIX} Monto cortesías: ${R(montoCortesias)} | Bono: ${R(bono)}`);
  console.log(`${PREFIX} Subtotal proyectado (subtotal - cortesías - bono): ${R(subtotalProyectado)}`);
  console.log(`${PREFIX} Precio a cobrar: ${R(precioCobrar)}`);
  console.log(`${PREFIX} Total costo: ${R(totalCosto)} | Total gasto: ${R(totalGasto)}`);
  console.log(`${PREFIX} Comisión (PrecioCobrar × ${comisionRatio}): ${R(montoComision)}`);
  console.log(`${PREFIX} Utilidad Neta = PrecioCobrar - TotalCosto - TotalGasto - Comisión = ${R(precioCobrar)} - ${R(totalCosto)} - ${R(totalGasto)} - ${R(montoComision)} = ${R(utilidadNeta)}`);
  console.groupEnd();
  console.log(`${PREFIX} === FIN AUDITORÍA ===`);
}
