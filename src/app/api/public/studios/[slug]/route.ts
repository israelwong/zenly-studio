import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: { slug: string } }
) {
    // Public API for studio landing
    return NextResponse.json({
        studio: params.slug,
        message: 'Public studio API'
    });
}
