import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { SessionStore } from "@/lib/session-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { agentId, customerName, customerPhone, policyId } = body;

    // Detect request origin if not specified in env
    const origin = req.headers.get("origin") || req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = SessionStore.createSession({
      agentId: agentId || "agent_andi_01",
      customerName: customerName || "Ibu Siti",
      customerPhone: customerPhone || "081234567890",
      policyId: policyId || "pol_retiresafe_2026",
      baseUrl: origin,
    });

    // Generate QR Code Data URL for the customer hand-off link
    if (session.customerUrl) {
      session.qrCodeDataUrl = await QRCode.toDataURL(session.customerUrl, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 300,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });
      session.status = "QR_GENERATED";
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize session and QR code",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const sessions = SessionStore.listSessions();
  return NextResponse.json({
    success: true,
    count: sessions.length,
    sessions,
  });
}
