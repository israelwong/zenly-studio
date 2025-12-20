import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    // Public lead capture API
    return NextResponse.json({ message: 'Lead captured' });
}
