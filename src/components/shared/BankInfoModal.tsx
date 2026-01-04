'use client';

import { Building2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { ZenDialog, ZenButton } from '@/components/ui/zen';
import { toast } from 'sonner';

interface BankInfo {
  banco?: string | null;
  titular?: string | null;
  clabe?: string | null;
}

interface BankInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankInfo: BankInfo;
  studioName?: string;
}

export function BankInfoModal({ 
  isOpen, 
  onClose, 
  bankInfo,
  studioName 
}: BankInfoModalProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('CLABE copiada al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Información Bancaria"
      icon={<Building2 className="h-5 w-5" />}
    >
      <div className="space-y-4">
        {studioName && (
          <p className="text-sm text-zinc-400">
            Datos bancarios de <span className="text-zinc-200 font-medium">{studioName}</span>
          </p>
        )}

        <div className="space-y-3 text-sm">
          {bankInfo.banco && (
            <div>
              <span className="text-zinc-400">Banco:</span>
              <p className="text-zinc-100 font-medium mt-1">{bankInfo.banco}</p>
            </div>
          )}

          {bankInfo.titular && (
            <div>
              <span className="text-zinc-400">Titular:</span>
              <p className="text-zinc-100 font-medium mt-1">{bankInfo.titular}</p>
            </div>
          )}

          {bankInfo.clabe ? (
            <div>
              <span className="text-zinc-400">CLABE Interbancaria:</span>
              <div className="flex items-center gap-2 mt-1 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
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
              💡 Usa esta CLABE para realizar transferencias SPEI. Recuerda guardar tu comprobante de pago.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <ZenButton onClick={onClose}>
            Cerrar
          </ZenButton>
        </div>
      </div>
    </ZenDialog>
  );
}

