'use client';

export function RequisitosLegalesCard() {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-1">
          Requisitos Legales (LFPDPPP)
        </h3>
        <p className="text-xs text-zinc-500 mb-3">
          El aviso de privacidad debe incluir los siguientes elementos obligatorios:
        </p>
      </div>
      <ul className="space-y-1.5 text-xs text-zinc-400">
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">•</span>
          <span>
            <strong className="text-zinc-300">Identidad y domicilio del responsable:</strong> Nombre y dirección del estudio
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">•</span>
          <span>
            <strong className="text-zinc-300">Finalidades del tratamiento:</strong> Propósitos para los que se recopilan los datos
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">•</span>
          <span>
            <strong className="text-zinc-300">Opciones para limitar uso/divulgación:</strong> Mecanismos para restringir el uso de datos
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">•</span>
          <span>
            <strong className="text-zinc-300">Medios para ejercer derechos ARCO:</strong> Acceso, Rectificación, Cancelación, Oposición
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">•</span>
          <span>
            <strong className="text-zinc-300">Transferencias de datos:</strong> Información sobre compartir datos con terceros
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">•</span>
          <span>
            <strong className="text-zinc-300">Procedimiento para comunicar cambios:</strong> Cómo se notificarán modificaciones
          </span>
        </li>
      </ul>
    </div>
  );
}

