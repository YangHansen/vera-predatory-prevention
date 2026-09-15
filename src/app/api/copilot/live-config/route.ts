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

  return NextResponse.json({
    success: true,
    wsUrl,
    model: "models/gemini-3.5-transcribe-live",
  });
}
