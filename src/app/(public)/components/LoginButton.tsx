'use client';

import Link from 'next/link';
import { ZenButton } from '@/components/ui/zen';

export function LoginButton() {
  return (
    <ZenButton variant="outline" size="sm" asChild>
      <Link href="/login">
        Iniciar Sesión
      </Link>
    </ZenButton>
  );
}

