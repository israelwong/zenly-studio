import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { studioSlug } = await request.json();
    
    if (!studioSlug) {
      return NextResponse.json({ error: 'studioSlug requerido' }, { status: 400 });
    }

    // Revalidar caché del catálogo
    revalidateTag(`catalog-shell-${studioSlug}`, 'max');
    
    return NextResponse.json({ 
      success: true, 
      message: `Caché revalidado para ${studioSlug}` 
    });
  } catch (error) {
    console.error('Error revalidando caché:', error);
    return NextResponse.json({ error: 'Error al revalidar' }, { status: 500 });
  }
}
