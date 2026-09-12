import { NextRequest, NextResponse } from "next/server";
import { GeminiService } from "@/lib/gemini";
import { getPolicyById, getDefaultPolicy } from "@/lib/dummy-data";
import { Policy } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { policyId, customTitle, customText } = body;

    let policy: Policy;

    if (customText && typeof customText === "string" && customText.trim().length > 0) {
      // Create a temporary Policy object from user's custom raw legal text
      policy = {
        id: "custom_input",
        code: "CUSTOM-01",
        name: customTitle || "Custom Legal Policy Clauses",
        provider: "Custom Test Input",
        type: "TERM_LIFE",
        premiumAmount: 0,
        premiumFrequency: "monthly",
        coverageAmount: 0,
        clauses: [
          {
            id: "cl_custom",
            title: customTitle || "Raw Legal Clauses",
            originalText: customText.trim(),
            simplifiedBullet: "",
            category: "coverage",
            isCritical: true,
          },
        ],
        simplifiedSummary: [],
      };
    } else {
      policy = (policyId ? getPolicyById(policyId) : undefined) || getDefaultPolicy();
    }

    const summaryBullets = await GeminiService.summarizePolicy(policy);

    return NextResponse.json({
      success: true,
      policyId: policy.id,
      policyName: policy.name,
      bulletCount: summaryBullets.length,
      bullets: summaryBullets,
      isLiveGemini: GeminiService.isConfigured(),
    });
  } catch (error) {
    console.error("Policy summarization error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate policy summary" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const policyId = req.nextUrl.searchParams.get("policyId");
  const policy = (policyId ? getPolicyById(policyId) : undefined) || getDefaultPolicy();
  const summaryBullets = await GeminiService.summarizePolicy(policy);

  return NextResponse.json({
    success: true,
    policy,
    bullets: summaryBullets,
    isLiveGemini: GeminiService.isConfigured(),
  });
}
