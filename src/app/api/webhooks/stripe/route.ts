import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    // Stripe webhook handler
    return NextResponse.json({ message: 'Stripe webhook received' });
}
