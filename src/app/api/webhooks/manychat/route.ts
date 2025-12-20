import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    // Manychat webhook handler
    return NextResponse.json({ message: 'Manychat webhook received' });
}
