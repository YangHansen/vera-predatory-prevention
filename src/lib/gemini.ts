import type { CopilotAnalysisResult, Policy } from "@/types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

export class GeminiService {
  /**
   * Check if Gemini API Key is available
   */
  static isConfigured(): boolean {
    return Boolean(GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 0);
  }

  /**
   * Summarizes complex insurance policy clauses into 3-5 ultra-simplified bullet points in English (FR-04)
   * aligned with MAS Guidelines on Fair Dealing & Clear Product Summaries.
   */
  static async summarizePolicy(policy: Policy): Promise<string[]> {
    if (!this.isConfigured()) {
      return policy.simplifiedSummary || [
        `Guaranteed coverage sum of S$${policy.coverageAmount.toLocaleString("en-SG")}`,
        `Regular premium of S$${policy.premiumAmount.toLocaleString("en-SG")} per ${policy.premiumFrequency}`,
        "Cashless admission with Letter of Guarantee at participating Singapore medical centres",
        "12-month waiting moratorium on pre-existing critical illnesses",
      ];
    }

    try {
      // Call Gemini API with free-tier supported model (gemini-3.5-flash-lite)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `You are an insurance regulatory compliance specialist in Singapore adhering strictly to the Monetary Authority of Singapore (MAS) Guidelines on Fair Dealing and the Financial Advisers Act (FAA).
Summarize the following complex insurance policy clauses into exactly 3 to 4 ultra-clear, concise English bullet points designed for a vulnerable or senior consumer (e.g., Mdm. Tan, 58 years old).
Only use facts provided in the policy text. Do not hallucinate or add outside benefits.

Policy Name: ${policy.name}
Clauses:
${policy.clauses.map((c) => `- ${c.title}: ${c.originalText}`).join("\n")}

Respond ONLY with a valid JSON array of strings in plain English, e.g. ["Point 1", "Point 2", "Point 3"]`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        }
      );

      const data = await response.json();
      const contentText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (contentText) {
        const parsed = JSON.parse(contentText);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("Gemini API call failed, falling back to pre-curated summary:", err);
    }

    return policy.simplifiedSummary;
  }

  /**
   * Analyzes live sales pitch conversation for aggressive tactics, misleading return claims, or missing disclosures (FR-02)
   * under MAS Market Conduct and Singapore Financial Advisers Act (FAA) standards.
   */
  static async analyzeSalesDialogue(dialogueSnippet: string): Promise<CopilotAnalysisResult> {
    const timestamp = new Date().toISOString();

    // Mock analysis when API key is missing or for rapid testing
    if (!this.isConfigured()) {
      return this.mockDialogueAnalysis(dialogueSnippet, timestamp);
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Analyze this insurance sales dialogue (which may include the advisor's pitch, customer conditions/inquiries, and Q&A exchanges between customer and advisor) for aggressive sales tactics, high-pressure closing, misleading guaranteed investment returns, omitted disclosures, or non-compliant answers to customer questions.
Assess strictly against Monetary Authority of Singapore (MAS) Guidelines on Fair Dealing, the Financial Advisers Act (FAA), and the Insurance Act (Section 25(5) Duty of Disclosure for pre-existing medical conditions).

Confidence threshold for warning trigger is 0.80.

Dialogue snippet: "${dialogueSnippet}"

Output JSON format strictly in English:
{
  "isCompliant": boolean,
  "warningFlags": "GREEN" | "YELLOW" | "RED",
  "confidenceScore": number (0.0 to 1.0),
  "detectedIssues": [
    {
      "type": "AGGRESSIVE_TACTIC" | "MISSING_DISCLOSURE" | "MISLEADING_RETURN" | "PRESSURE_SIGNING" | "JARGON_OVERLOAD",
      "severity": "low" | "medium" | "high",
      "confidence": number,
      "triggerSnippet": string,
      "explanation": string
    }
  ],
  "auditedQnAs": [
    {
      "clientQuestion": string,
      "advisorAnswer": string,
      "isCompliant": boolean,
      "flag": "GREEN" | "YELLOW" | "RED",
      "topic": "PRE_EXISTING_CONDITION" | "SURRENDER_PENALTY" | "GUARANTEED_RETURN" | "PREMIUM_ESCALATION" | "OTHER",
      "regulatoryNotice": string,
      "explanation": string,
      "compliantScript": string
    }
  ],
  "suggestedAnswers": [
    {
      "questionOrObjection": string,
      "suggestedResponse": string,
      "cheatSheetBullet": string
    }
  ]
}`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        }
      );

      const data = await response.json();
      const contentText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (contentText) {
        const parsed = JSON.parse(contentText);
        return {
          ...parsed,
          timestamp,
        };
      }
    } catch (err) {
      console.warn("Gemini live copilot analysis failed, returning heuristic analysis:", err);
    }

    return this.mockDialogueAnalysis(dialogueSnippet, timestamp);
  }

  /**
   * Transcribes speech audio using Google Gemini Multimodal Audio STT (FR-01, FR-02).
   */
  static async transcribeAudio(
    audioBase64: string,
    mimeType = "audio/webm"
  ): Promise<{ transcript: string; engine: "google-gemini-cloud" | "google-cloud-speech" | "mock" }> {
    if (!this.isConfigured() || !audioBase64) {
      return {
        transcript: "",
        engine: "mock",
      };
    }

    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-z0-9\-]+;base64,/, "");
    // Clean mime type to supported format
    const normalizedMime = mimeType.includes("wav")
      ? "audio/wav"
      : mimeType.includes("mp4")
      ? "audio/mp4"
      : "audio/webm";

    const defaultModels = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"];
    const preferredModel = process.env.GEMINI_TRANSCRIBE_MODEL;
    const modelsToTry = preferredModel
      ? [preferredModel, ...defaultModels.filter((m) => m !== preferredModel)]
      : defaultModels;

    for (const model of modelsToTry) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: "Transcribe ONLY human speech verbatim in English with accurate punctuation. If the audio is silent or contains no distinct words, reply EMPTY.",
                    },
                    {
                      inlineData: {
                        mimeType: normalizedMime,
                        data: cleanBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.0,
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          let transcript = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
          transcript = transcript.replace(/^["']|["']$/g, "").trim();

          const lower = transcript.toLowerCase();
          if (
            transcript.length > 0 &&
            !lower.includes("no speech") &&
            !lower.includes("empty") &&
            lower !== "no, no." &&
            lower !== "no."
          ) {
            return {
              transcript,
              engine: "google-gemini-cloud",
            };
          }
        }
      } catch (err) {
        console.warn(`Gemini audio STT failed with model ${model}:`, err);
      }
    }

    return {
      transcript: "",
      engine: "mock",
    };
  }

  private static mockDialogueAnalysis(snippet: string, timestamp: string): CopilotAnalysisResult {
    const lower = snippet.toLowerCase();

    // Check for Q&A turns with pre-existing condition or non-disclosure violations
    if (
      (lower.includes("pre-existing") || lower.includes("hypertension") || lower.includes("diabetes") || lower.includes("condition")) &&
      (lower.includes("don't declare") || lower.includes("dont declare") || lower.includes("leave it blank") || lower.includes("no need to mention") || lower.includes("approves everyone"))
    ) {
      return {
        isCompliant: false,
        warningFlags: "RED",
        confidenceScore: 0.98,
        detectedIssues: [
          {
            type: "MISSING_DISCLOSURE",
            severity: "high",
            confidence: 0.98,
            triggerSnippet: snippet,
            explanation:
              "Advised client to conceal or omit pre-existing medical conditions. Under Section 25(5) of the Singapore Insurance Act, failure to disclose material facts entitles the insurer to void the contract and deny claims.",
          },
        ],
        auditedQnAs: [
          {
            clientQuestion: "Inquired about coverage for pre-existing medical condition (hypertension/illness)",
            advisorAnswer: "Advised not to declare or leave blank on application form",
            isCompliant: false,
            flag: "RED",
            topic: "PRE_EXISTING_CONDITION",
            regulatoryNotice: "Section 25(5) Insurance Act (Duty of Disclosure)",
            explanation:
              "Advisors must never encourage non-disclosure. Concealing pre-existing illnesses risks total policy repudiation and claim forfeiture.",
            compliantScript:
              "Mdm. Tan, under Singapore law, you must fully declare all pre-existing conditions. The insurer will underwrite the policy accurately so you are guaranteed legitimate coverage without claim disputes later.",
          },
        ],
        suggestedAnswers: [
          {
            questionOrObjection: "Pre-existing Medical Condition Duty of Disclosure",
            suggestedResponse:
              "Mdm. Tan, it is critical that we declare all past medical histories accurately under the Insurance Act. While pre-existing conditions may have waiting periods or exclusions, full honesty guarantees that your valid claims will never be contested.",
            cheatSheetBullet: "Enforce Section 25(5) Insurance Act: Always disclose all past diagnoses and treatments.",
          },
        ],
        timestamp,
      };
    }

    // Predatory trigger detection (Singapore MAS Fair Dealing Violations)
    if (
      lower.includes("guaranteed profit") ||
      lower.includes("no risk") ||
      lower.includes("guaranteed 20%") ||
      lower.includes("sign right now") ||
      lower.includes("don't read the fine print") ||
      lower.includes("free money") ||
      lower.includes("pasti untung") ||
      lower.includes("tidak ada risiko")
    ) {
      return {
        isCompliant: false,
        warningFlags: "YELLOW",
        confidenceScore: 0.89,
        detectedIssues: [
          {
            type: "MISLEADING_RETURN",
            severity: "high",
            confidence: 0.89,
            triggerSnippet: snippet,
            explanation:
              "Promised guaranteed high investment returns without disclosing market volatility, capital risks, or front-end acquisition charges under MAS Notice FAA-N03.",
          },
        ],
        auditedQnAs: [
          {
            clientQuestion: "Asked about investment return guarantees and safety",
            advisorAnswer: "Promised risk-free returns or urged immediate signing without reading terms",
            isCompliant: false,
            flag: "YELLOW",
            topic: "GUARANTEED_RETURN",
            regulatoryNotice: "Section 26 Financial Advisers Act (FAA)",
            explanation: "Investment-linked returns must never be represented as capital-guaranteed.",
            compliantScript:
              "Mdm. Tan, investment-linked policies fluctuate with financial markets. Your insurance protection is secured, but cash value depends on fund performance.",
          },
        ],
        suggestedAnswers: [
          {
            questionOrObjection: "Investment Return Expectations & Volatility",
            suggestedResponse:
              "Mdm. Tan, it is important to note that investment-linked returns fluctuate with financial market conditions. While historical returns are indicative, your capital is not capital-guaranteed.",
            cheatSheetBullet: "State clearly: 'Investment funds are subject to market risks; life protection remains guaranteed.'",
          },
        ],
        timestamp,
      };
    }

    // Customer objection trigger detection
    if (lower.includes("expensive") || lower.includes("safe") || lower.includes("withdraw") || lower.includes("cancel")) {
      return {
        isCompliant: true,
        warningFlags: "GREEN",
        confidenceScore: 0.93,
        detectedIssues: [],
        suggestedAnswers: [
          {
            questionOrObjection: "Premium Affordability & Liquidity Inquiries",
            suggestedResponse:
              "Mdm. Tan, this S$450 monthly premium provides long-term peace of mind with a guaranteed annuity starting at age 62, alongside S$250,000 protection for your family.",
            cheatSheetBullet: "Highlight long-term security and family safeguards without applying closing pressure.",
          },
        ],
        timestamp,
      };
    }

    // Default clean dialogue
    return {
      isCompliant: true,
      warningFlags: "GREEN",
      confidenceScore: 0.96,
      detectedIssues: [],
      suggestedAnswers: [
        {
          questionOrObjection: "Waiting Period Clarification",
          suggestedResponse:
            "Please note that pre-existing conditions are subject to a 12-month waiting period as stipulated in standard MAS benefit illustrations.",
          cheatSheetBullet: "Confirm customer acknowledgement of the 12-month pre-existing condition clause.",
        },
      ],
      timestamp,
    };
  }
}
