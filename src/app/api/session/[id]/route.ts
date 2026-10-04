import { NextRequest, NextResponse } from "next/server";
import { SessionStore } from "@/lib/session-store";
import { AgentStore } from "@/lib/agent-store";
import { getPolicyById, getDefaultPolicy } from "@/lib/dummy-data";
import { canEnterConversation, hasCompletedOnboarding, isWorkspaceSession } from "@/lib/session-workflow";
import { canBeginFinalReview } from "@/lib/review-readiness";
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

    if (typeof body.agentDisclosureConfirmed === "boolean") changes.agentDisclosureConfirmed = body.agentDisclosureConfirmed;

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
    if (typeof body.clientQuestion === "string" && !body.resolveQuestionId) {
      const qText = body.clientQuestion.trim();
      const currentQuestions: ClientQuestionItem[] = [...(existing.clientQuestions || [])];

      if (qText.length > 0) {
        // Add new question or update existing without duplicate
        changes.clientQuestion = qText.slice(0, 350);
        const normQ = qText.toLowerCase();
        const existingIdx = currentQuestions.findIndex(
          (q) => q.question.toLowerCase().trim() === normQ,
        );
        if (existingIdx >= 0) {
          currentQuestions[existingIdx] = {
            ...currentQuestions[existingIdx],
            status: "PENDING",
            statusLabel: "Needs explanation",
            timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          };
        } else {
          const newQ: ClientQuestionItem = {
            id: `q_${Date.now()}`,
            question: qText.slice(0, 350),
            status: "PENDING",
            statusLabel: "Needs explanation",
            timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          };
          currentQuestions.push(newQ);
        }
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
      if (!existing.clientQuestions?.some((q) => q.id === body.resolveQuestionId)) {
        return NextResponse.json({ success: false, error: "Question not found. Refresh and try again." }, { status: 404 });
      }
      const baseQuestions: ClientQuestionItem[] = changes.clientQuestions || [...(existing.clientQuestions || [])];
      changes.clientQuestions = baseQuestions.map((q) =>
        q.id === body.resolveQuestionId
          ? {
              ...q,
              status: "ANSWERED",
              statusLabel: "Discussed with advisor",
              resolvedByAgentAt: new Date().toISOString(),
              advisorAnswer: typeof body.advisorAnswer === "string" && body.advisorAnswer.trim()
                ? body.advisorAnswer.trim().slice(0, 2000) : q.advisorAnswer,
            }
          : q,
      );
      // Clear clientQuestion if the resolved question was pending or if no other questions remain pending
      changes.clientQuestion = changes.clientQuestions.find((q) => q.status !== "ANSWERED")?.question || "";
    }

    if (body.policyId) changes.policyId = body.policyId;
    if (body.agentId) changes.agentId = body.agentId;
    if (body.customerName) changes.customerName = body.customerName;
    if (body.customerPhone) changes.customerPhone = body.customerPhone;
    if (body.status) changes.status = body.status;

    const candidate = { ...existing, ...changes };
    if (isWorkspaceSession(existing)) {
      if (body.status === "HANDED_OFF" && !hasCompletedOnboarding(candidate)) {
        return NextResponse.json({ success: false, error: "Complete both privacy notices and the opening camera check first." }, { status: 409 });
      }
      if ((body.endConversation === true || body.dialogueBuffer !== undefined) && (!canEnterConversation(candidate) || existing.status !== "HANDED_OFF" || (body.dialogueBuffer !== undefined && existing.conversationEndedAt))) {
        return NextResponse.json({ success: false, error: "Complete client onboarding and the agent disclosure before recording." }, { status: 409 });
      }
    }
    if (body.status === "QR_GENERATED" && existing.status !== "QR_GENERATED") {
      changes.readTopics = [];
      changes.conversationEndedAt = undefined;
      changes.calibratedMesh = undefined;
      changes.calibratedFaceImage = undefined;
      changes.recordingConsent = false;
      changes.cameraConsent = false;
      changes.agentDisclosureConfirmed = false;
    }
    const policy = getPolicyById(changes.policyId || existing.policyId) || getDefaultPolicy();
    if (changes.policyId && changes.policyId !== existing.policyId) {
      changes.readTopics = [];
      changes.conversationEndedAt = undefined;
    }
    if (body.readTopics !== undefined) {
      if (existing.status !== "HANDED_OFF" || !Array.isArray(body.readTopics) ||
          !body.readTopics.every((i: number) => Number.isInteger(i) && i >= 0 && i <= policy.simplifiedSummary.length)) {
        return NextResponse.json({ success: false, error: "Invalid reading progress." }, { status: 400 });
      }
      changes.readTopics = [...new Set<number>([...(changes.readTopics || existing.readTopics || []), ...body.readTopics])];
    }
    if (body.endConversation === true) {
      if (existing.status !== "HANDED_OFF") {
        return NextResponse.json({ success: false, error: "The client must finish onboarding first." }, { status: 409 });
      }
      changes.conversationEndedAt = existing.conversationEndedAt || new Date().toISOString();
    }
    if (["CUSTOMER_REVIEWING", "LIVENESS_CHECK"].includes(body.status) &&
        !canBeginFinalReview({ ...existing, ...changes }, policy)) {
      return NextResponse.json({ success: false, error: "Read every policy detail and wait for your agent to end the conversation before final review." }, { status: 409 });
    }
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
