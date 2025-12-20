import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // Embeddable widget API
    return NextResponse.json({ message: 'Widget API' });
}
