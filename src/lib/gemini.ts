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
  "conversationSummary": [
    "string (concise 1-2 sentence plain-English summary of what was explained or discussed so far for the customer's live mobile screen)"
  ],
  "clientQuestions": [
    {
      "id": "string",
      "question": "string (Customer question asked during meeting)",
      "advisorAnswer": "string (Advisor response)",
      "status": "ANSWERED" | "PENDING" | "NEEDS_CLARIFICATION",
      "statusLabel": "Reviewed with Advisor" | "Still needs explanation" | "Needs clarification",
      "topic": "string"
    }
  ],
  "coveredSectionIds": [1, 2, 3, 4] (Array of policy section IDs covered: 1 for What is covered, 2 for What you pay, 3 for When cover starts, 4 for How to cancel),
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
          conversationSummary: Array.isArray(parsed.conversationSummary) && parsed.conversationSummary.length > 0
            ? parsed.conversationSummary
            : ["Advisor reviewed core policy coverage, monthly premiums, and statutory free-look cancellation terms."],
          clientQuestions: Array.isArray(parsed.clientQuestions) ? parsed.clientQuestions : [],
          coveredSectionIds: Array.isArray(parsed.coveredSectionIds) ? parsed.coveredSectionIds : [1],
          auditEngine: "google-gemini-live",
          modelUsed: GEMINI_MODEL,
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

    const defaultModels = ["gemini-3.5-flash-lite", "gemini-3.5-transcribe", "gemini-3.5-flash"];
    const preferredModel = process.env.GEMINI_TRANSCRIBE_MODEL;
    const modelsToTry = preferredModel && preferredModel !== "gemini-3.5-transcribe-live"
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
    const rawResult = this.evaluateHeuristicDialogue(snippet, timestamp);
    return {
      ...rawResult,
      auditEngine: "mas-regulatory-rules-fallback",
      modelUsed: "Vera MAS Compliance Rules Engine (Offline Fallback)",
      timestamp,
    };
  }

  private static evaluateHeuristicDialogue(snippet: string, timestamp: string): CopilotAnalysisResult {
    const lower = snippet.toLowerCase();

    // 1. Check for Q&A turns with pre-existing condition or non-disclosure violations
    if (
      (lower.includes("pre-existing") || lower.includes("hypertension") || lower.includes("diabetes") || lower.includes("cholesterol") || lower.includes("condition") || lower.includes("diagnos")) &&
      (lower.includes("don't declare") || lower.includes("dont declare") || lower.includes("leave that section blank") || lower.includes("leave it blank") || lower.includes("no need to mention") || lower.includes("approves everyone") || lower.includes("don't even need to declare"))
    ) {
      return {
        isCompliant: false,
        warningFlags: "RED",
        confidenceScore: 0.99,
        detectedIssues: [
          {
            type: "MISSING_DISCLOSURE",
            severity: "high",
            confidence: 0.99,
            triggerSnippet: snippet,
            explanation:
              "Advised client to conceal or omit pre-existing medical conditions (hypertension/cholesterol). Under Section 25(5) of the Singapore Insurance Act, failure to disclose material facts entitles the insurer to void the policy and repudiate future claims.",
          },
        ],
        auditedQnAs: [
          {
            clientQuestion: "Inquired about coverage and declaration of pre-existing hypertension / medical diagnosis",
            advisorAnswer: "Advised not to declare or leave blank on the application form to avoid delay",
            isCompliant: false,
            flag: "RED",
            topic: "PRE_EXISTING_CONDITION",
            regulatoryNotice: "Section 25(5) Insurance Act (Duty of Disclosure) & MAS Fair Dealing",
            explanation:
              "Advisors must never encourage non-disclosure. Concealing pre-existing illnesses risks total policy repudiation and claim forfeiture.",
            compliantScript:
              "Mdm. Tan, under Section 25(5) of the Insurance Act, we must declare all past diagnoses. After the standard 12-month waiting period, you will have legitimate coverage without any claim disputes later.",
          },
        ],
        suggestedAnswers: [
          {
            questionOrObjection: "Pre-existing Medical Condition Duty of Disclosure",
            suggestedResponse:
              "Mdm. Tan, it is critical that we declare all past medical histories accurately under the Insurance Act. Full honesty guarantees that your valid claims will never be contested.",
            cheatSheetBullet: "Enforce Section 25(5) Insurance Act: Always disclose all past diagnoses and treatments.",
          },
        ],
        conversationSummary: [
          "You asked about whether your pre-existing health condition will be covered.",
          "Advisor discussed Singapore Insurance Act Section 25(5) mandatory disclosure rules and the standard 12-month waiting period.",
        ],
        clientQuestions: [
          {
            id: "q_med_01",
            question: "Will the policy cover my pre-existing health diagnosis?",
            advisorAnswer: "Advised not to declare or leave blank on form",
            status: "NEEDS_CLARIFICATION",
            statusLabel: "Still needs explanation",
            topic: "PRE_EXISTING_CONDITION",
            timestamp,
          },
        ],
        coveredSectionIds: [1, 3],
        timestamp,
      };
    }

    // 2. Check for early surrender penalty concealment
    if (
      (lower.includes("withdraw") || lower.includes("penalty") || lower.includes("surrender") || lower.includes("cancel") || lower.includes("year 2 or 3") || lower.includes("university")) &&
      (lower.includes("zero penalty") || lower.includes("no penalty") || lower.includes("anytime you want") || lower.includes("bank account") || lower.includes("functions just like"))
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
              "Concealed early surrender penalties (15% in first 36 months) by falsely claiming the policy functions like an everyday bank account with zero deduction.",
          },
        ],
        auditedQnAs: [
          {
            clientQuestion: "Asked about early withdrawals in Year 2/3 for family needs without penalty",
            advisorAnswer: "Falsely claimed funds can be withdrawn anytime with zero penalty like a bank account",
            isCompliant: false,
            flag: "RED",
            topic: "SURRENDER_PENALTY",
            regulatoryNotice: "MAS Notice FAA-N03 & Guidelines on Fair Dealing",
            explanation:
              "Concealing contractual 15% surrender deductions violates MAS Fair Dealing requirements for fair product representations.",
            compliantScript:
              "Mdm. Tan, please note that life insurance savings plans involve a 36-month lock-in. Early surrender incurs an administrative deduction of 15% on total cash value.",
          },
        ],
        suggestedAnswers: [
          {
            questionOrObjection: "Surrender Value & Early Withdrawal Charges",
            suggestedResponse:
              "Mdm. Tan, this policy is structured for long-term retirement. If surrendered within the first 36 months, a 15% penalty applies. After 36 months, 100% of accumulated cash value is preserved.",
            cheatSheetBullet: "Disclose 15% 36-month early surrender penalty clearly before closing.",
          },
        ],
        conversationSummary: [
          "You asked about early savings withdrawals in year 2 or 3.",
          "Advisor discussed the 36-month lock-in period, 15% surrender deduction, and 14-day statutory free-look cancellation right.",
        ],
        clientQuestions: [
          {
            id: "q_surr_01",
            question: "Can I withdraw my money in year 2 or 3 without any penalty?",
            advisorAnswer: "Claimed zero penalty like a bank account",
            status: "NEEDS_CLARIFICATION",
            statusLabel: "Still needs explanation",
            topic: "SURRENDER_PENALTY",
            timestamp,
          },
        ],
        coveredSectionIds: [2, 4],
        timestamp,
      };
    }

    // 3. Predatory & Deceptive Pitch Detection (Aggressive tactics, false exclusivity, pressure signing)
    if (
      lower.includes("shouldn't even be showing") ||
      lower.includes("reserved for our high net worth") ||
      lower.includes("wealth accelerator") ||
      lower.includes("sign line 14") ||
      lower.includes("sign right now") ||
      lower.includes("rate jumps by 40%") ||
      lower.includes("guaranteed profit") ||
      lower.includes("guaranteed 25%") ||
      lower.includes("guaranteed 20%") ||
      lower.includes("risk-free wealth") ||
      lower.includes("zero risk") ||
      lower.includes("no risk") ||
      lower.includes("guaranteed, risk-free") ||
      lower.includes("free money") ||
      lower.includes("broke and evicted") ||
      lower.includes("legal fluff") ||
      lower.includes("waived sign-up fee expire")
    ) {
      return {
        isCompliant: false,
        warningFlags: "RED",
        confidenceScore: 0.98,
        detectedIssues: [
          {
            type: "AGGRESSIVE_TACTIC",
            severity: "high",
            confidence: 0.96,
            triggerSnippet: "Reserved for high net worth VIP clients / Urging immediate signature",
            explanation:
              "Employed artificial scarcity ('high net worth VIP tier') and emotional manipulation to rush the client into purchasing without reviewing contractual terms.",
          },
          {
            type: "MISLEADING_RETURN",
            severity: "high",
            confidence: 0.98,
            triggerSnippet: "Guaranteed, risk-free wealth accelerator outpacing inflation",
            explanation:
              "Represented insurance policy as a guaranteed, risk-free wealth accelerator beating inflation. Under Singapore Financial Advisers Act (FAA), investment-linked returns cannot be represented as risk-free.",
          },
          {
            type: "PRESSURE_SIGNING",
            severity: "high",
            confidence: 0.97,
            triggerSnippet: "Don't need to read all 50 pages, just sign line 14 right here",
            explanation:
              "Pressured client to sign line 14 while actively discouraging reading the product summary and fine print, violating MAS Guidelines on Fair Dealing.",
          },
        ],
        auditedQnAs: [
          {
            clientQuestion: "Evaluated high-pressure pitch and guaranteed wealth claims",
            advisorAnswer: "Claimed risk-free guaranteed inflation-beating return and urged signing line 14 immediately",
            isCompliant: false,
            flag: "RED",
            topic: "GUARANTEED_RETURN",
            regulatoryNotice: "Section 26 Financial Advisers Act (FAA) & MAS Notice FAA-N03",
            explanation:
              "Advisors must never rush signatures or represent fluctuating participating returns as risk-free guaranteed wealth.",
            compliantScript:
              "Mdm. Tan, let me walk you through the product summary. While your S$250,000 base life cover and annuity payouts are guaranteed, non-guaranteed returns fluctuate with fund performance. Take your time to review.",
          },
        ],
        suggestedAnswers: [
          {
            questionOrObjection: "Investment Risk & Contractual Reading Rights",
            suggestedResponse:
              "Mdm. Tan, please take your time to review the product terms. You have a statutory 14-day Free-Look right to cancel with 100% full refund.",
            cheatSheetBullet: "Never rush signatures; emphasize 14-day Free-Look cancellation right.",
          },
        ],
        conversationSummary: [
          "Advisor introduced the policy benefits, annuity payout schedule, and premium structure.",
          "Reviewed 14-day statutory Free-Look right to cancel with 100% full refund before signing.",
        ],
        clientQuestions: [
          {
            id: "q_risk_01",
            question: "Is the investment return guaranteed and what are the risks?",
            advisorAnswer: "Claimed guaranteed risk-free wealth accelerator",
            status: "NEEDS_CLARIFICATION",
            statusLabel: "Still needs explanation",
            topic: "GUARANTEED_RETURN",
            timestamp,
          },
        ],
        coveredSectionIds: [1, 2, 4],
        timestamp,
      };
    }

    // 4. Compliant pitch with pre-existing disclosure and section 25(5)
    if (lower.includes("section 25") || lower.includes("waiting period") || lower.includes("450 monthly") || lower.includes("retiresafe")) {
      return {
        isCompliant: true,
        warningFlags: "GREEN",
        confidenceScore: 0.98,
        detectedIssues: [],
        auditedQnAs: [
          {
            clientQuestion: "Inquired about pre-existing medical condition coverage",
            advisorAnswer: "Explained mandatory duty of disclosure under Section 25(5) and standard 12-month waiting period",
            isCompliant: true,
            flag: "GREEN",
            topic: "PRE_EXISTING_CONDITION",
            regulatoryNotice: "Compliant with Section 25(5) Insurance Act",
            explanation:
              "Advisor properly communicated the duty of disclosure and the statutory waiting period moratorium.",
            compliantScript:
              "Mdm. Tan, all pre-existing health conditions will be declared accurately to ensure legitimate policy protection.",
          },
        ],
        suggestedAnswers: [
          {
            questionOrObjection: "Policy Terms & Payout Verification",
            suggestedResponse:
              "Mdm. Tan, this policy guarantees a monthly annuity starting at age 62 and immediate S$250,000 protection for your family.",
            cheatSheetBullet: "Confirmed compliant disclosure of benefits, exclusions, and statutory waiting periods.",
          },
        ],
        conversationSummary: [
          "Advisor explained the S$450/month regular premium and S$250,000 family protection coverage.",
          "Confirmed mandatory pre-existing condition disclosure under Section 25(5) of the Insurance Act and the 12-month waiting period.",
        ],
        clientQuestions: [
          {
            id: "q_comp_01",
            question: "How do I declare pre-existing conditions and when does coverage start?",
            advisorAnswer: "Explained Section 25(5) disclosure and 12-month waiting period",
            status: "ANSWERED",
            statusLabel: "Reviewed with Advisor",
            topic: "PRE_EXISTING_CONDITION",
            timestamp,
          },
        ],
        coveredSectionIds: [1, 2, 3],
        timestamp,
      };
    }

    // Default clean dialogue
    const defaultCovered: number[] = [];
    if (lower.includes("cover") || lower.includes("benefit") || lower.includes("protection") || lower.includes("annuity")) defaultCovered.push(1);
    if (lower.includes("premium") || lower.includes("pay") || lower.includes("fee") || lower.includes("cost")) defaultCovered.push(2);
    if (lower.includes("waiting") || lower.includes("medical") || lower.includes("condition")) defaultCovered.push(3);
    if (lower.includes("cancel") || lower.includes("surrender") || lower.includes("free-look")) defaultCovered.push(4);

    return {
      isCompliant: true,
      warningFlags: "GREEN",
      confidenceScore: 0.95,
      detectedIssues: [],
      auditedQnAs: [
        {
          clientQuestion: "General Policy Review",
          advisorAnswer: "Explaining policy terms and benefits to client",
          isCompliant: true,
          flag: "GREEN",
          topic: "OTHER",
          regulatoryNotice: "MAS Guidelines on Fair Dealing",
          explanation: "Speech is compliant with Singapore fair dealing conduct standards.",
          compliantScript: "Please take your time to review the simplified policy summary.",
        },
      ],
      suggestedAnswers: [
        {
          questionOrObjection: "Policy Overview & Next Steps",
          suggestedResponse:
            "Mdm. Tan, please feel free to ask any questions about benefits, waiting periods, or surrender values before signing.",
          cheatSheetBullet: "Promote informed consent and patient explanation.",
        },
      ],
      conversationSummary: [
        "Advisor is presenting the policy terms, coverage benefits, and regular payment schedule.",
        "Statutory 14-day Free-Look cancellation rights apply to all life policies under MAS guidelines.",
      ],
      clientQuestions: [
        {
          id: "q_gen_01",
          question: "What are my regular monthly premiums and key benefits?",
          advisorAnswer: "Explained regular premium and coverage protection amount",
          status: "ANSWERED",
          statusLabel: "Reviewed with Advisor",
          topic: "COVERAGE",
          timestamp,
        },
      ],
      coveredSectionIds: defaultCovered.length > 0 ? defaultCovered : [1, 2],
      timestamp,
    };
  }
}
