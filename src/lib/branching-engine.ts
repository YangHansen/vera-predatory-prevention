import type {
  ComplianceFlag,
  BranchingResult,
  LivenessTelemetry,
  CopilotAnalysisResult,
} from "@/types";
import { getMasStatusLabel } from "@/types";

export interface BranchingInput {
  liveness: LivenessTelemetry;
  copilotEvents: CopilotAnalysisResult[];
  hasValidSignature: boolean;
  policySummaryCount?: number;
  discussionPointCount?: number;
  questionCount?: number;
}

export class BranchingEngine {
  /**
   * Evaluates compliance rules based on PRD VERA-MVP-2026 specifications
   * and Singapore MAS Guidelines on Fair Dealing & Clear Product Consent:
   * 
   * Decision Matrix:
   * 1. RED FLAG ("Compliance Risk"):
   *    - Any agent statement flagged RED (severe predatory tactics, misleading guarantees, Section 25(5) violation).
   *    - Missing or invalid electronic signature.
   * 
   * 2. YELLOW FLAG ("Flagged for Secondary Audit"):
   *    - Trigger 1 (Agent Misalignment): Any agent statement flagged YELLOW (e.g. omitted surrender penalty disclosure,
   *      unaddressed customer condition, moderate pressure).
   *    - Trigger 2 (Customer Confusion with Compliant Agent Dialogue):
   *      Even if 100% of agent statements are GREEN, if customer confusion score exceeds the dynamic 30% threshold
   *      relative to the total count of policy summary points and live discussion/question points,
   *      the submission is automatically flagged for secondary audit.
   * 
   * 3. GREEN FLAG ("Approved" / Fast-Track 1 Business Day):
   *    - All agent statements are GREEN.
   *    - Customer confusion score is within the 30% threshold across total summary and discussion points.
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

    // 2. Calculate Dynamic Touchpoints (Policy Summary Points + Discussion / Question Count)
    const policySummaryPoints = Math.max(1, input.policySummaryCount ?? 4);

    const copilotDiscussionPoints = input.copilotEvents.reduce(
      (max, ev) => Math.max(max, ev.conversationSummary?.length || 0),
      0
    );
    const copilotQuestions = input.copilotEvents.reduce(
      (max, ev) => Math.max(max, ev.clientQuestions?.length || 0),
      0
    );

    const discussionPoints = Math.max(0, input.discussionPointCount ?? copilotDiscussionPoints);
    const questionPoints = Math.max(0, input.questionCount ?? copilotQuestions);
    const totalPoints = policySummaryPoints + discussionPoints + questionPoints;

    // 3. Calculate Customer Confusion Score (Duration & Intensity Weighted)
    const confusionEvents = input.liveness.confusionEvents || [];
    const confusionScore = input.liveness.confusionScore !== undefined
      ? input.liveness.confusionScore
      : confusionEvents.reduce((acc, ev) => {
          const weight = ev.intensity === "high" ? 3 : ev.intensity === "moderate" ? 2 : 1;
          return acc + weight;
        }, 0);
    const confusionCount = input.liveness.confusionEventsCount ?? confusionEvents.length;

    // Dynamic Threshold: 30% ratio of Confusion Score to Total Touchpoints
    // (with a minimum floor of 3 weighted points to prevent false positives on brief summaries)
    const thresholdScore = Math.max(3, Math.round(totalPoints * 0.30));
    const confusionRatio = totalPoints > 0 ? confusionScore / totalPoints : 0;
    const hasElevatedCustomerConfusion = confusionScore > thresholdScore && confusionScore >= 3;

    // 4. Evaluate Compliance Decision
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
          `Compound Factor: Customer also exhibited elevated confusion (Score: ${confusionScore}, Ratio: ${Math.round(confusionRatio * 100)}% vs 30% threshold of ${thresholdScore} across ${totalPoints} points) during policy summary review.`
        );
      }
    } else if (hasElevatedCustomerConfusion) {
      // Trigger 2: All agent statements compliant, but customer exhibited elevated confusion during summary review
      flag = "YELLOW";
      reasonCategory = "CUSTOMER_CONFUSION";
      internalNotes.push(
        `Elevated Customer Confusion: All agent statements were compliant, but customer exhibited repeated confusion/hesitation during summary review (Confusion Score: ${confusionScore}, Ratio: ${Math.round(confusionRatio * 100)}% exceeding 30% threshold of ${thresholdScore} across ${totalPoints} total summary & discussion points). Flagged for Secondary Audit.`
      );
    }

    // 5. Liveness baseline verification check
    if (!input.liveness.passed) {
      if (flag === "GREEN") {
        flag = "YELLOW";
        reasonCategory = "CUSTOMER_CONFUSION";
      }
      internalNotes.push("Customer liveness verification was inconclusive or failed facial mesh alignment check.");
    }

    // 6. Signature verification
    if (!input.hasValidSignature) {
      flag = "RED";
      reasonCategory = "INVALID_SIGNATURE";
      internalNotes.push("Missing or invalid electronic consent signature under Singapore Electronic Transactions Act.");
    }

    const now = new Date().toISOString();
    const masStatusLabel = getMasStatusLabel(flag);
    const roundedRatio = Math.round(confusionRatio * 100) / 100;

    if (flag === "GREEN") {
      return {
        flag: "GREEN",
        masStatusLabel,
        fastTrackApproved: true,
        estimatedReviewDays: 1,
        customerFacingStatus: "APPROVED_FAST_TRACK",
        customerFacingMessage: "Your application has been verified and fast-tracked for expedited underwriting approval (Estimated 1 business day).",
        internalAuditNotes: [
          `All Singapore MAS Fair Dealing criteria met: Clean advisor audio audit (${input.copilotEvents.length} compliant turns), verified liveness, informed consent confirmed. Customer confusion ratio: ${Math.round(confusionRatio * 100)}% (within 30% threshold of ${thresholdScore} across ${totalPoints} total summary & discussion points). Status: Approved.`
        ],
        submittedAt: now,
        reasonCategory: "CLEAN_PASS",
        confusionScore,
        confusionCount,
        confusionRatio: roundedRatio,
        totalPointsCount: totalPoints,
        confusionThresholdScore: thresholdScore,
      };
    } else if (flag === "YELLOW") {
      return {
        flag: "YELLOW",
        masStatusLabel,
        fastTrackApproved: false,
        estimatedReviewDays: 3,
        customerFacingStatus: "SUBMITTED_FOR_REVIEW",
        customerFacingMessage: "Your signature has been securely received. Your policy application is queued for standard compliance review by our central underwriting team (Estimated 3–4 business days).",
        internalAuditNotes: internalNotes,
        submittedAt: now,
        reasonCategory,
        confusionScore,
        confusionCount,
        confusionRatio: roundedRatio,
        totalPointsCount: totalPoints,
        confusionThresholdScore: thresholdScore,
      };
    } else {
      return {
        flag: "RED",
        masStatusLabel,
        fastTrackApproved: false,
        estimatedReviewDays: 4,
        customerFacingStatus: "SUBMITTED_FOR_REVIEW",
        customerFacingMessage: "Your signature has been recorded. Your application requires further manual verification by the Compliance and Underwriting Department.",
        internalAuditNotes: internalNotes,
        submittedAt: now,
        reasonCategory,
        confusionScore,
        confusionCount,
        confusionRatio: roundedRatio,
        totalPointsCount: totalPoints,
        confusionThresholdScore: thresholdScore,
      };
    }
  }
}
