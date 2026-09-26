import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { SessionStore } from "@/lib/session-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { agentId, customerName, customerPhone, policyId, baseUrl: customBaseUrl } = body;

    // Detect request origin, respecting client customBaseUrl or headers
    const detectedOrigin =
      customBaseUrl ||
      req.headers.get("origin") ||
      req.nextUrl.origin ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const session = SessionStore.createSession({
      agentId: agentId || "agt_andi_01",
      customerName: customerName || "Mdm. Tan",
      customerPhone: customerPhone || "+65 9123 4567",
      policyId: policyId || "pol_retiresafe_sg",
      baseUrl: detectedOrigin,
    });

    if (body.clientExperience === "workspace") {
      session.customerUrl = `${detectedOrigin}/client/${session.id}`;
      SessionStore.updateSession(session.id, {
        customerUrl: session.customerUrl,
      });
    }

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
      SessionStore.updateSession(session.id, {
        qrCodeDataUrl: session.qrCodeDataUrl,
        status: "QR_GENERATED",
      });
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

export async function GET(req: NextRequest) {
  let agentId: string | undefined;
  if (req && req.url) {
    try {
      const url = new URL(req.url);
      agentId = url.searchParams.get("agentId") || undefined;
    } catch {
      // ignore
    }
  }
  const sessions = SessionStore.listSessions(agentId);
  return NextResponse.json({
    success: true,
    count: sessions.length,
    sessions,
  });
}
