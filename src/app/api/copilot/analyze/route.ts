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
