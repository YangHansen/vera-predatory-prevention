import { NextRequest, NextResponse } from "next/server";
import { GeminiService } from "@/lib/gemini";
import { SessionStore } from "@/lib/session-store";
import { CopilotAnalysisRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CopilotAnalysisRequest;
    const { sessionId, text } = body;

    if (!text && !body.audioBase64) {
      return NextResponse.json(
        { success: false, error: "Either text transcript or audioBase64 is required" },
        { status: 400 }
      );
    }

    const dialogueSnippet = text || "Audio chunk received";
    const analysisResult = await GeminiService.analyzeSalesDialogue(dialogueSnippet);

    if (sessionId) {
      SessionStore.addCopilotEvent(sessionId, analysisResult);

      // Extract clause topic from audited QnAs, detected issues, or dialogue keywords for live mirrored screen sync
      let topic: "WAITING_PERIOD" | "SURRENDER_PENALTY" | "GUARANTEED_RETURN" | "DUTY_OF_DISCLOSURE" | "COVERAGE" | "GENERAL" = "GUARANTEED_RETURN";
      let clauseId = "c1";
      let note = "Guaranteed Monthly Annuity Payout Terms";

      const lower = dialogueSnippet.toLowerCase();

      // 1. First Priority: Check explicit audited Q&A topics
      if (analysisResult.auditedQnAs && analysisResult.auditedQnAs.length > 0) {
        const qnaTopic = analysisResult.auditedQnAs[0].topic;
        if (qnaTopic === "PRE_EXISTING_CONDITION") {
          topic = "WAITING_PERIOD";
          clauseId = "c4";
          note = "Pre-Existing Medical Disclosures & 12-Month Waiting Period";
        } else if (qnaTopic === "SURRENDER_PENALTY") {
          topic = "SURRENDER_PENALTY";
          clauseId = "c3";
          note = "Early Surrender Deductions & Statutory 14-Day Free-Look";
        } else if (qnaTopic === "GUARANTEED_RETURN") {
          topic = "GUARANTEED_RETURN";
          clauseId = "c1";
          note = "Guaranteed Monthly Annuity Payout & Capital Risks";
        }
      }

      // 2. Second Priority: If not resolved by explicit QnA, inspect detected issues & keywords
      if (clauseId === "c1" && topic === "GUARANTEED_RETURN" && (!analysisResult.auditedQnAs || analysisResult.auditedQnAs[0]?.topic !== "GUARANTEED_RETURN")) {
        const issueTypes = (analysisResult.detectedIssues || []).map((i) => i.type);
        if (issueTypes.includes("MISSING_DISCLOSURE") || lower.includes("waiting period") || lower.includes("medical") || lower.includes("hospital") || lower.includes("hypertension") || lower.includes("declare") || lower.includes("fine print")) {
          topic = "WAITING_PERIOD";
          clauseId = "c4";
          note = "Pre-Existing Condition Exclusions & Duty of Disclosure";
        } else if (issueTypes.includes("PRESSURE_SIGNING") || lower.includes("surrender") || lower.includes("cancel") || lower.includes("penalty") || lower.includes("sign line 14") || lower.includes("boilerplate") || lower.includes("free-look") || lower.includes("walk out")) {
          topic = "SURRENDER_PENALTY";
          clauseId = "c3";
          note = "Early Surrender Charges & 14-Day Free-Look Cancellation Rights";
        } else if (issueTypes.includes("MISLEADING_RETURN") || lower.includes("guarantee") || lower.includes("wealth accelerator") || lower.includes("annuity") || lower.includes("fixed return") || lower.includes("profit")) {
          topic = "GUARANTEED_RETURN";
          clauseId = "c1";
          note = "Guaranteed Monthly Annuity & Fund Volatility Disclosures";
        } else if (lower.includes("coverage") || lower.includes("250,000") || lower.includes("disability") || lower.includes("death")) {
          topic = "COVERAGE";
          clauseId = "c2";
          note = "Immediate S$250,000 Life & Disability Coverage";
        } else if (issueTypes.includes("AGGRESSIVE_TACTIC")) {
          topic = "SURRENDER_PENALTY";
          clauseId = "c3";
          note = "Consumer Protection: Rights under MAS Fair Dealing";
        }
      }

      SessionStore.updateSyncedHighlight(sessionId, {
        topic,
        clauseId,
        matchedText: dialogueSnippet.slice(0, 150),
        advisorNote: note,
      });
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
    });
  } catch (error) {
    console.error("Copilot analysis error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to analyze copilot audio/dialogue" },
      { status: 500 }
    );
  }
}
