"use client";

import React from "react";
import type { CotizacionRenderData } from "@/components/shared/contracts/types";
import { renderCotizacionBlock } from "@/components/shared/contracts/utils/contract-renderer";

interface CotizacionBlockProps {
  cotizacion: CotizacionRenderData;
}

export function CotizacionBlock({ cotizacion }: CotizacionBlockProps) {
  const html = renderCotizacionBlock(cotizacion);
  return (
    <div
      className="cotizacion-block-wrapper"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

