export type SessionStatus =
  | "INITIALIZED"
  | "AGENT_ACTIVE"
  | "QR_GENERATED"
  | "HANDED_OFF"
  | "CUSTOMER_REVIEWING"
  | "LIVENESS_CHECK"
  | "CONSENT_SIGNED"
  | "SUBMITTED"
  | "OFFLINE_PAUSED";

export type ComplianceFlag = "GREEN" | "YELLOW" | "RED";

export interface PolicyClause {
  id: string;
  title: string;
  originalText: string;
  simplifiedBullet: string;
  category: "coverage" | "exclusion" | "premium" | "payout" | "surrender";
  isCritical: boolean;
}

export interface Policy {
  id: string;
  code: string;
  name: string;
  provider: string;
  type: "TERM_LIFE" | "CRITICAL_ILLNESS" | "UNIT_LINK" | "HEALTH_CARE";
  premiumAmount: number;
  premiumFrequency: "monthly" | "annually";
  coverageAmount: number;
  clauses: PolicyClause[];
  simplifiedSummary: string[];
}

export interface CopilotAnalysisRequest {
  sessionId: string;
  text?: string;
  audioBase64?: string;
  mimeType?: string;
  context?: {
    agentId?: string;
    customerId?: string;
    policyId?: string;
    step?: string;
  };
}

export interface DetectedIssue {
  type: "AGGRESSIVE_TACTIC" | "MISSING_DISCLOSURE" | "MISLEADING_RETURN" | "PRESSURE_SIGNING" | "JARGON_OVERLOAD";
  severity: "low" | "medium" | "high";
  confidence: number; // 0.0 - 1.0
  triggerSnippet: string;
  explanation: string;
}

export interface AuditedQnA {
  clientQuestion: string;
  advisorAnswer: string;
  isCompliant: boolean;
  flag: ComplianceFlag;
  topic?: "PRE_EXISTING_CONDITION" | "SURRENDER_PENALTY" | "GUARANTEED_RETURN" | "PREMIUM_ESCALATION" | "OTHER";
  regulatoryNotice?: string; // e.g. "Section 25(5) Insurance Act", "MAS Notice FAA-N03", "Section 26 FAA"
  explanation: string;
  compliantScript: string;
}

export interface CopilotAnalysisResult {
  isCompliant: boolean;
  warningFlags: ComplianceFlag; // GREEN, YELLOW, or RED
  confidenceScore: number; // e.g. 0.85
  detectedIssues: DetectedIssue[];
  auditedQnAs?: AuditedQnA[];
  suggestedAnswers: {
    questionOrObjection: string;
    suggestedResponse: string;
    cheatSheetBullet: string;
  }[];
  timestamp: string;
}

export interface LivenessTelemetry {
  passed: boolean;
  score: number;
  confusionDetected: boolean;
  confusionEventsCount: number;
  timeSpentReviewingSeconds: number;
  timerFallbackTriggered: boolean;
}

export interface ConsentSubmissionRequest {
  sessionId: string;
  customerId: string;
  policyId: string;
  signatureDataUrl: string;
  liveness: LivenessTelemetry;
  agentAudioAuditPassed: boolean;
  clientIp?: string;
  userAgent?: string;
}

export interface BranchingResult {
  flag: ComplianceFlag;
  fastTrackApproved: boolean;
  estimatedReviewDays: number; // 1 for Green, 3-4 for Yellow
  customerFacingStatus: "APPROVED_FAST_TRACK" | "SUBMITTED_FOR_REVIEW";
  customerFacingMessage: string;
  internalAuditNotes: string[];
  submittedAt: string;
}

export interface Session {
  id: string;
  agentId: string;
  customerName?: string;
  customerPhone?: string;
  policyId: string;
  status: SessionStatus;
  qrCodeDataUrl?: string;
  customerUrl?: string;
  copilotEvents: CopilotAnalysisResult[];
  livenessTelemetry?: LivenessTelemetry;
  consentResult?: BranchingResult;
  signatureDataUrl?: string;
  createdAt: string;
  updatedAt: string;
  isOfflineCached?: boolean;
}
