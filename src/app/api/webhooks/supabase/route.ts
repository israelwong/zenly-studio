import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    // Supabase webhook handler
    return NextResponse.json({ message: 'Supabase webhook received' });
}
