"use client";

import React from "react";
import type { CondicionesComercialesData } from "@/components/shared/contracts/types";
import { renderCondicionesComercialesBlock } from "@/components/shared/contracts/utils/contract-renderer";

interface CondicionesComercialesBlockProps {
  condiciones: CondicionesComercialesData;
}

export function CondicionesComercialesBlock({
  condiciones,
}: CondicionesComercialesBlockProps) {
  const html = renderCondicionesComercialesBlock(condiciones);
  return (
    <div
      className="condiciones-comerciales-wrapper"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

