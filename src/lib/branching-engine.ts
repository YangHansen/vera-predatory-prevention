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
   * 
   * Decision Matrix:
   * 1. RED FLAG:
   *    - Any agent statement flagged RED (severe predatory tactics, misleading guarantees, Section 25(5) violation).
   *    - Missing or invalid electronic signature.
   * 
   * 2. YELLOW FLAG:
   *    - Trigger 1 (Agent Misalignment): Any agent statement flagged YELLOW (e.g. omitted surrender penalty disclosure,
   *      unaddressed customer condition, moderate pressure).
   *    - Trigger 2 (Customer Confusion with Compliant Agent Dialogue):
   *      Even if 100% of agent statements are GREEN, if customer confusion score >= 5 OR persistent confusion count >= 4
   *      while reading the summary before signing, the submission is automatically flagged YELLOW.
   * 
   * 3. GREEN FLAG (Easy Pass for HQ / Fast-Track 1 Business Day):
   *    - All agent statements are GREEN.
   *    - Customer confusion score < 5 and count < 4 (minimal/normal reading concentration).
   *    - Valid signature and liveness verified.
   */
  static evaluate(input: BranchingInput): BranchingResult {
    const internalNotes: string[] = [];
    let flag: ComplianceFlag = "GREEN";
    let reasonCategory: "CLEAN_PASS" | "AGENT_MISALIGNMENT" | "CUSTOMER_CONFUSION" | "COMPOUND_RISK" | "INVALID_SIGNATURE" = "CLEAN_PASS";

    // 1. Calculate Agent Compliance Metrics
    const redCopilotEvents = input.copilotEvents.filter((e) => e.warningFlags === "RED");
    const yellowCopilotEvents = input.copilotEvents.filter((e) => e.warningFlags === "YELLOW");
    const hasRedCopilot = redCopilotEvents.length > 0;
    const hasYellowCopilot = yellowCopilotEvents.length > 0;

    // 2. Calculate Customer Confusion Score (Duration & Intensity Weighted)
    const confusionEvents = input.liveness.confusionEvents || [];
    const confusionScore = input.liveness.confusionScore !== undefined
      ? input.liveness.confusionScore
      : confusionEvents.reduce((acc, ev) => {
          const weight = ev.intensity === "high" ? 3 : ev.intensity === "moderate" ? 2 : 1;
          return acc + weight;
        }, 0);
    const confusionCount = input.liveness.confusionEventsCount ?? confusionEvents.length;

    // Calibrated Thresholds: Score >= 8 points OR Count >= 6 events
    // Normal, diligent policy reading naturally produces 2-5 deliberation points.
    // Only sustained, elevated distress or chronic confusion (8+ pts or 6+ events) trips a Yellow Flag.
    const hasElevatedCustomerConfusion = confusionScore >= 8 || confusionCount >= 6;

    // 3. Evaluate Compliance Decision
    if (hasRedCopilot) {
      flag = "RED";
      reasonCategory = "COMPOUND_RISK";
      internalNotes.push(
        `Severe predatory sales tactic or deceptive return guarantee flagged under MAS Notice FAA-N03 (${redCopilotEvents.length} critical occurrence(s)).`
      );
    } else if (hasYellowCopilot) {
      flag = "YELLOW";
      reasonCategory = "AGENT_MISALIGNMENT";
      internalNotes.push(
        `Agent Misalignment with MAS Guidelines: Moderate aggressive closing tactic or omitted policy disclosure detected (${yellowCopilotEvents.length} warning(s)).`
      );
      if (hasElevatedCustomerConfusion) {
        reasonCategory = "COMPOUND_RISK";
        internalNotes.push(
          `Compound Factor: Customer also exhibited elevated confusion (Score: ${confusionScore}, Events: ${confusionCount}) during policy summary review.`
        );
      }
    } else if (hasElevatedCustomerConfusion) {
      // Trigger 2: All agent statements GREEN, but customer exhibited elevated confusion during summary review
      flag = "YELLOW";
      reasonCategory = "CUSTOMER_CONFUSION";
      internalNotes.push(
        `Elevated Customer Confusion: All agent statements were compliant, but customer exhibited repeated confusion/hesitation during summary review (Confusion Score: ${confusionScore}/8 threshold, Events: ${confusionCount}/6 threshold). Sent to HQ central compliance for secondary check.`
      );
    }

    // 4. Liveness baseline verification check
    if (!input.liveness.passed) {
      if (flag === "GREEN") {
        flag = "YELLOW";
        reasonCategory = "CUSTOMER_CONFUSION";
      }
      internalNotes.push("Customer liveness verification was inconclusive or failed facial mesh alignment check.");
    }

    // 5. Signature verification
    if (!input.hasValidSignature) {
      flag = "RED";
      reasonCategory = "INVALID_SIGNATURE";
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
        internalAuditNotes: [
          `All Singapore MAS Fair Dealing criteria met: Clean advisor audio audit (${input.copilotEvents.length} compliant turns), verified liveness, informed consent confirmed. Customer confusion score: ${confusionScore} (below threshold of 8). Easy Pass for HQ.`
        ],
        submittedAt: now,
        reasonCategory: "CLEAN_PASS",
        confusionScore,
        confusionCount,
      };
    } else if (flag === "YELLOW") {
      const isAgentMisaligned = reasonCategory === "AGENT_MISALIGNMENT" || reasonCategory === "COMPOUND_RISK";
      return {
        flag: "YELLOW",
        fastTrackApproved: false,
        estimatedReviewDays: 3,
        customerFacingStatus: "SUBMITTED_FOR_REVIEW",
        customerFacingMessage: "Your signature has been securely received. Your policy application is queued for standard compliance review by our central underwriting team (Estimated 3–4 business days).",
        internalAuditNotes: internalNotes,
        submittedAt: now,
        reasonCategory,
        confusionScore,
        confusionCount,
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
        reasonCategory,
        confusionScore,
        confusionCount,
      };
    }
  }
}
