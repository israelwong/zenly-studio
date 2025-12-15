'use client';

import { Building2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { ZenCard, ZenButton } from '@/components/ui/zen';
import { useToast } from '@/hooks/useToast';
import type { StudioBankInfo } from '@/types/client';

interface BankInfoCardProps {
  bankInfo: StudioBankInfo;
}

export function BankInfoCard({ bankInfo }: BankInfoCardProps) {
  const [copied, setCopied] = useState(false);
  const { success } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    success('CLABE copiada al portapapeles', 2000);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ZenCard>
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Información Bancaria
        </h3>

        <div className="space-y-3 text-sm">
          {bankInfo.banco && (
            <div>
              <span className="text-zinc-400">Banco:</span>
              <p className="text-zinc-100 font-medium">{bankInfo.banco}</p>
            </div>
          )}

          {bankInfo.titular && (
            <div>
              <span className="text-zinc-400">Titular:</span>
              <p className="text-zinc-100 font-medium">{bankInfo.titular}</p>
            </div>
          )}

          {bankInfo.clabe ? (
            <div>
              <span className="text-zinc-400">CLABE Interbancaria:</span>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-zinc-100 font-mono text-base font-bold flex-1">
                  {bankInfo.clabe}
                </p>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(bankInfo.clabe!)}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </ZenButton>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-400">
                Información bancaria no disponible. Contacta al estudio.
              </p>
            </div>
          )}
        </div>

        {bankInfo.clabe && (
          <div className="pt-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">
              Usa esta CLABE para realizar transferencias SPEI. Recuerda guardar tu comprobante.
            </p>
          </div>
        )}
      </div>
    </ZenCard>
  );
}

