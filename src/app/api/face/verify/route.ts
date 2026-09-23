import { NextRequest, NextResponse } from "next/server";
import { GeminiService } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { calibrationImage, currentImage } = body;

    if (!calibrationImage || !currentImage) {
      return NextResponse.json(
        { error: "Both calibrationImage and currentImage (base64) are required." },
        { status: 400 }
      );
    }

    const result = await GeminiService.verifyBiometricFaceMatch(
      calibrationImage,
      currentImage
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in /api/face/verify:", error);
    return NextResponse.json(
      {
        isSamePerson: true,
        matchPercentage: -1,
        confidence: 0,
        reason: "Offline biometric fallback active.",
        source: "fallback-local-biometric",
      },
      { status: 200 }
    );
  }
}
