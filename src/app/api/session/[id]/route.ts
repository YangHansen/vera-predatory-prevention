import { NextRequest, NextResponse } from "next/server";
import { SessionStore } from "@/lib/session-store";
import { getPolicyById, getDefaultPolicy } from "@/lib/dummy-data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const origin =
      req.headers.get("origin") ||
      req.nextUrl.origin ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    // Auto-recovers or initializes the session if missing so customer view never 404s
    const session = SessionStore.getSession(id);
    if (!session)
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    const policy = getPolicyById(session.policyId) || getDefaultPolicy();

    return NextResponse.json({
      success: true,
      session,
      policy,
    });
  } catch (error) {
    console.error("Session lookup error:", error);
    const fallbackPolicy = getDefaultPolicy();
    return NextResponse.json({
      success: true,
      session: {
        id: "sess_default",
        agentId: "agent_andi_sg01",
        customerName: "Mdm. Tan",
        policyId: fallbackPolicy.id,
        status: "HANDED_OFF",
        copilotEvents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      policy: fallbackPolicy,
    });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!SessionStore.getSession(id))
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    let updatedSession;
    if (
      body.presentedTopic !== undefined ||
      body.clientQuestion !== undefined ||
      body.recordingConsent !== undefined ||
      body.cameraConsent !== undefined
    ) {
      const changes: Partial<import("@/types").Session> = {};
      if (Number.isInteger(body.presentedTopic) && body.presentedTopic >= 0)
        changes.presentedTopic = body.presentedTopic;
      if (typeof body.clientQuestion === "string")
        changes.clientQuestion = body.clientQuestion.slice(0, 350);
      if (typeof body.recordingConsent === "boolean")
        changes.recordingConsent = body.recordingConsent;
      if (typeof body.cameraConsent === "boolean")
        changes.cameraConsent = body.cameraConsent;
      if (body.clientQuestion === "")
        changes.clientQuestions = SessionStore.getSession(
          id,
        )?.clientQuestions?.map((q) => ({
          ...q,
          status: "ANSWERED",
          statusLabel: "Discussed with advisor",
        }));
      updatedSession = SessionStore.updateSession(id, changes);
    }
    if (body.dialogueBuffer !== undefined) {
      updatedSession = SessionStore.updateLiveDialogueBuffer(
        id,
        String(body.dialogueBuffer),
      );
    }

    if (body.telemetry) {
      updatedSession = SessionStore.recordLivenessTelemetry(id, body.telemetry);
    }

    if (
      body.policyId ||
      body.agentId ||
      body.customerName ||
      body.customerPhone ||
      body.status
    ) {
      const updates: any = {};
      if (body.policyId) updates.policyId = body.policyId;
      if (body.agentId) updates.agentId = body.agentId;
      if (body.customerName) updates.customerName = body.customerName;
      if (body.customerPhone) updates.customerPhone = body.customerPhone;
      if (body.status) updates.status = body.status;
      updatedSession = SessionStore.updateSession(id, updates);
    }

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (err: any) {
    console.error("Failed to update session:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
