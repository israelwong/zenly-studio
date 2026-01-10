import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleManyChatWebhook } from "@/lib/integrations/manychat/webhook-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook handler para ManyChat
 * URL: /api/webhooks/manychat?studio={studioSlug}
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studioSlug = searchParams.get("studio");

    if (!studioSlug) {
      return NextResponse.json(
        { error: "studio parameter required" },
        { status: 400 }
      );
    }

    // Verificar que el studio existe y tiene ManyChat conectado
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      include: {
        manychat_config: {
          where: { is_connected: true },
        },
      },
    });

    if (!studio || !studio.manychat_config) {
      return NextResponse.json(
        { error: "Studio not found or ManyChat not connected" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = await handleManyChatWebhook(studio.id, body);

    if (result.success) {
      return NextResponse.json({ received: true });
    } else {
      console.error("[ManyChat Webhook] Error:", result.error);
      return NextResponse.json(
        { error: result.error || "Error processing webhook" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[ManyChat Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
