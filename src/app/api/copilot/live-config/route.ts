import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY || "";

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
  const rawModel = process.env.GEMINI_LIVE_MODEL || "gemini-3.5-transcribe-live";
  const model = rawModel.startsWith("models/") ? rawModel : `models/${rawModel}`;

  return NextResponse.json({
    success: true,
    wsUrl,
    model,
  });
}
