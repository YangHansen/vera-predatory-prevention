import { NextRequest, NextResponse } from "next/server";
import { SessionStore } from "@/lib/session-store";
import { AgentStore } from "@/lib/agent-store";
import { getPolicyById, getDefaultPolicy } from "@/lib/dummy-data";
import type { Session, ClientQuestionItem } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = SessionStore.getSession(id);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    const policy = getPolicyById(session.policyId) || getDefaultPolicy();
    const advisor = AgentStore.getAgent(session.agentId) || AgentStore.getDefaultAgent();

    return NextResponse.json({
      success: true,
      session,
      policy,
      advisor,
    });
  } catch (error: any) {
    console.error("Session lookup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve session" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = SessionStore.getSession(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    const changes: Partial<Session> = {};

    if (body.presentedTopic !== undefined && Number.isInteger(body.presentedTopic) && body.presentedTopic >= 0) {
      changes.presentedTopic = body.presentedTopic;
    }

    if (typeof body.recordingConsent === "boolean") {
      changes.recordingConsent = body.recordingConsent;
    }

    if (typeof body.cameraConsent === "boolean") {
      changes.cameraConsent = body.cameraConsent;
    }

    if (Array.isArray(body.calibratedMesh)) {
      changes.calibratedMesh = body.calibratedMesh;
    }

    if (typeof body.calibratedFaceImage === "string") {
      changes.calibratedFaceImage = body.calibratedFaceImage;
    }

    // Handle Client Questions
    if (typeof body.clientQuestion === "string") {
      const qText = body.clientQuestion.trim();
      const currentQuestions: ClientQuestionItem[] = [...(existing.clientQuestions || [])];

      if (qText.length > 0) {
        // Add new question
        changes.clientQuestion = qText.slice(0, 350);
        const newQ: ClientQuestionItem = {
          id: `q_${Date.now()}`,
          question: qText.slice(0, 350),
          status: "PENDING",
          statusLabel: "Needs explanation",
          timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        };
        currentQuestions.push(newQ);
        changes.clientQuestions = currentQuestions;
      } else {
        // Clear/resolve pending questions
        changes.clientQuestion = "";
        changes.clientQuestions = currentQuestions.map((q) => ({
          ...q,
          status: "ANSWERED",
          statusLabel: "Discussed with advisor",
        }));
      }
    }

    // Resolve specific question by ID if provided
    if (body.resolveQuestionId) {
      const currentQuestions: ClientQuestionItem[] = [...(existing.clientQuestions || [])];
      changes.clientQuestions = currentQuestions.map((q) =>
        q.id === body.resolveQuestionId
          ? { ...q, status: "ANSWERED", statusLabel: "Discussed with advisor" }
          : q
      );
    }

    if (body.policyId) changes.policyId = body.policyId;
    if (body.agentId) changes.agentId = body.agentId;
    if (body.customerName) changes.customerName = body.customerName;
    if (body.customerPhone) changes.customerPhone = body.customerPhone;
    if (body.status) changes.status = body.status;

    let updatedSession = SessionStore.updateSession(id, changes);

    if (body.dialogueBuffer !== undefined) {
      updatedSession = SessionStore.updateLiveDialogueBuffer(id, String(body.dialogueBuffer));
    }

    if (body.telemetry) {
      updatedSession = SessionStore.recordLivenessTelemetry(id, body.telemetry);
    }

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (err: any) {
    console.error("Failed to update session:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
