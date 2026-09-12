import type { ComplianceFlag, BranchingResult, LivenessTelemetry, CopilotAnalysisResult } from "@/types";

export interface BranchingInput {
  liveness: LivenessTelemetry;
  copilotEvents: CopilotAnalysisResult[];
  hasValidSignature: boolean;
}

export class BranchingEngine {
  /**
   * Evaluates compliance rules based on PRD VERA-MVP-2026 specifications
   * and Singapore MAS Guidelines on Fair Dealing & Clear Product Consent:
   * 1. Advisor audio audit (aggressive tactics / omitted disclosures with ~80% threshold).
   * 2. Customer liveness and facial confusion telemetry.
   * 3. Timer fallback delay trigger.
   * 4. Customer signature completion.
   */
  static evaluate(input: BranchingInput): BranchingResult {
    const internalNotes: string[] = [];
    let flag: ComplianceFlag = "GREEN";

    // 1. Check Audio Copilot Flags
    const recentCopilotFlags = input.copilotEvents.map((e) => e.warningFlags);
    const hasRedCopilot = recentCopilotFlags.includes("RED");
    const hasYellowCopilot = recentCopilotFlags.includes("YELLOW");

    if (hasRedCopilot) {
      flag = "RED";
      internalNotes.push("Severe predatory sales tactic or deceptive return guarantee flagged under MAS Notice FAA-N03.");
    } else if (hasYellowCopilot) {
      flag = "YELLOW";
      internalNotes.push("Moderate aggressive closing tactic or omitted policy disclosure flagged during advisory audit.");
    }

    // 2. Check Customer Liveness & Confusion
    if (!input.liveness.passed) {
      flag = flag === "RED" ? "RED" : "YELLOW";
      internalNotes.push("Customer liveness verification was inconclusive or failed initial facial landmark check.");
    }

    if (input.liveness.confusionDetected || input.liveness.timerFallbackTriggered) {
      if (flag === "GREEN") {
        flag = "YELLOW";
      }
      internalNotes.push("Customer facial confusion detected during policy summary review; timer fallback delay was engaged.");
    }

    // 3. Signature verification
    if (!input.hasValidSignature) {
      flag = "RED";
      internalNotes.push("Missing or invalid electronic consent signature under Singapore Electronic Transactions Act.");
    }

    const now = new Date().toISOString();

    if (flag === "GREEN") {
      return {
        flag: "GREEN",
        fastTrackApproved: true,
        estimatedReviewDays: 1,
        customerFacingStatus: "APPROVED_FAST_TRACK",
        customerFacingMessage: "Your application has been verified and fast-tracked for expedited underwriting approval (Estimated 1 business day).",
        internalAuditNotes: ["All Singapore MAS Fair Dealing criteria met: Clean audio audit, verified liveness, informed consent confirmed."],
        submittedAt: now,
      };
    } else if (flag === "YELLOW") {
      return {
        flag: "YELLOW",
        fastTrackApproved: false,
        estimatedReviewDays: 3,
        customerFacingStatus: "SUBMITTED_FOR_REVIEW",
        customerFacingMessage: "Your signature has been securely received. Your policy application is queued for standard compliance review by our central underwriting team (Estimated 3–4 business days).",
        internalAuditNotes: internalNotes,
        submittedAt: now,
      };
    } else {
      return {
        flag: "RED",
        fastTrackApproved: false,
        estimatedReviewDays: 4,
        customerFacingStatus: "SUBMITTED_FOR_REVIEW",
        customerFacingMessage: "Your signature has been recorded. Your application requires further manual verification by the Compliance and Underwriting Department.",
        internalAuditNotes: internalNotes,
        submittedAt: now,
      };
    }
  }
}
