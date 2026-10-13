import { NextRequest, NextResponse } from "next/server";
import { BranchingEngine } from "@/lib/branching-engine";
import { SessionStore } from "@/lib/session-store";
import { canBeginFinalReview } from "@/lib/review-readiness";
import { getPolicyById, getDefaultPolicy } from "@/lib/dummy-data";
import { namesMatch, isWorkspaceSession } from "@/lib/session-workflow";
import { ConsentSubmissionRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ConsentSubmissionRequest;
    const { sessionId, signatureDataUrl, liveness } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "sessionId is required" },
        { status: 400 }
      );
    }

    const session = SessionStore.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    if (isWorkspaceSession(session) && (
      !["CUSTOMER_REVIEWING", "LIVENESS_CHECK"].includes(session.status) ||
      !canBeginFinalReview(session, getPolicyById(session.policyId) || getDefaultPolicy())
    )) {
      return NextResponse.json({ success: false, error: "Complete the conversation and reading steps before signing." }, { status: 409 });
    }
    if ((isWorkspaceSession(session) || body.signedName !== undefined) && !namesMatch(body.signedName, session.customerName)) {
      return NextResponse.json({ success: false, error: "Your full name must match the client name entered by your agent." }, { status: 400 });
    }
    if (isWorkspaceSession(session) && session.clientQuestions?.some((q) => q.status !== "ANSWERED")) {
      return NextResponse.json({ success: false, error: "Ask your agent to resolve the remaining questions before signing." }, { status: 409 });
    }
    const defaultLiveness = {
      passed: true,
      score: 0.95,
      confusionDetected: false,
      confusionEventsCount: 0,
      timeSpentReviewingSeconds: 30,
      timerFallbackTriggered: false,
    };

    const evaluatedLiveness = liveness || defaultLiveness;
    const hasValidSignature = Boolean(signatureDataUrl && signatureDataUrl.startsWith("data:image"));

    const policy = getPolicyById(session.policyId) || getDefaultPolicy();
    const policySummaryCount = policy?.simplifiedSummary?.length || 4;

    const discussionPointCount = Array.isArray(session.conversationSummary)
      ? session.conversationSummary.length
      : typeof session.conversationSummary === "string"
      ? (session.conversationSummary as string).split("\n").filter(Boolean).length
      : 0;
    const questionCount = session.clientQuestions?.length || (session.clientQuestion ? 1 : 0) || 0;

    // Evaluate branching logic engine
    const branchingResult = BranchingEngine.evaluate({
      liveness: evaluatedLiveness,
      copilotEvents: session.copilotEvents,
      hasValidSignature,
      policySummaryCount,
      discussionPointCount,
      questionCount,
    });

    // Update Session
    SessionStore.recordLivenessTelemetry(sessionId, evaluatedLiveness);
    SessionStore.recordConsentSubmission(sessionId, signatureDataUrl || "", branchingResult);

    return NextResponse.json({
      success: true,
      sessionId,
      result: branchingResult,
      session: SessionStore.getSession(sessionId),
    });
  } catch (error) {
    console.error("Consent submission error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process consent submission" },
      { status: 500 }
    );
  }
}
