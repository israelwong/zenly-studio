import React from 'react'
import { Metadata } from 'next'
import Contrato from '../components/Contrato'

export const metadata: Metadata = {
  title: 'Contrato',
}

interface PageProps { params: Promise<{ eventoId: string }> }

export default async function Page({ params }: PageProps) {
  const { eventoId } = await params;
  return <Contrato eventoId={eventoId} />
}
