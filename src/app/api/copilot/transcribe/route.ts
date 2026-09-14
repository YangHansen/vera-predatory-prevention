import { NextRequest, NextResponse } from "next/server";
import { GeminiService } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { audioBase64, mimeType } = body;

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return NextResponse.json(
        { success: false, error: "audioBase64 field is required" },
        { status: 400 }
      );
    }

    const result = await GeminiService.transcribeAudio(
      audioBase64,
      mimeType || "audio/webm"
    );

    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      engine: result.engine,
    });
  } catch (error) {
    console.error("Transcription API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process audio transcription" },
      { status: 500 }
    );
  }
}
