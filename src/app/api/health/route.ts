import { NextResponse } from "next/server";
import { GeminiService } from "@/lib/gemini";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Vera API Engine",
    version: "2.0.0-MVP",
    geminiConfigured: GeminiService.isConfigured(),
    timestamp: new Date().toISOString(),
  });
}
