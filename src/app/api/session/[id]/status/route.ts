import { NextRequest, NextResponse } from "next/server";
import { SessionStore } from "@/lib/session-store";
import { hasCompletedOnboarding, isWorkspaceSession } from "@/lib/session-workflow";
import { canBeginFinalReview } from "@/lib/review-readiness";
import { getPolicyById, getDefaultPolicy } from "@/lib/dummy-data";
import { SessionStatus } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body as { status: SessionStatus };

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Status field is required" },
        { status: 400 }
      );
    }

    const existing = SessionStore.getSession(id);
    if (existing && isWorkspaceSession(existing) && status === "HANDED_OFF" && !hasCompletedOnboarding(existing)) {
      return NextResponse.json({ success: false, error: "Client onboarding is incomplete." }, { status: 409 });
    }
    if (existing && ["CUSTOMER_REVIEWING", "LIVENESS_CHECK"].includes(status) &&
        !canBeginFinalReview(existing, getPolicyById(existing.policyId) || getDefaultPolicy())) {
      return NextResponse.json({ success: false, error: "Final review requires all policy details read and the conversation ended." }, { status: 409 });
    }
    const updated = status === "QR_GENERATED" && existing && existing.status !== "QR_GENERATED"
      ? SessionStore.updateSession(id, {
          status, readTopics: [], conversationEndedAt: undefined, calibratedMesh: undefined,
          calibratedFaceImage: undefined, recordingConsent: false, cameraConsent: false, agentDisclosureConfirmed: false,
        })
      : SessionStore.updateSessionStatus(id, status);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: updated,
    });
  } catch (error) {
    console.error("Failed to update status:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
