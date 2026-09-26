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

export type MasStatusLabel = "Approved" | "Flagged for Secondary Audit" | "Compliance Risk";

export function getMasStatusLabel(flag?: ComplianceFlag): MasStatusLabel {
  if (flag === "YELLOW") return "Flagged for Secondary Audit";
  if (flag === "RED") return "Compliance Risk";
  return "Approved";
}

export interface AgentAccount {
  id: string; // e.g., "agt_andi_01"
  repNumber: string; // MAS Representative Number, e.g. "MAS-REP-882910"
  fullName: string; // e.g., "Andi Wijaya, ChFC"
  email: string; // e.g., "andi.wijaya@verainsure.sg"
  phone: string; // e.g., "+65 9876 5432"
  agencyFirm: string; // e.g., "Vera Financial Advisory Pte Ltd"
  role: "SENIOR_ADVISOR" | "WEALTH_PLANNER" | "FINANCIAL_CONSULTANT" | "COMPLIANCE_OFFICER";
  status: "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";
  complianceRating: number; // e.g. 98.4 (%)
  totalSessions: number;
  createdAt: string;
  updatedAt: string;
}

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
  type: "TERM_LIFE" | "CRITICAL_ILLNESS" | "UNIT_LINK" | "HEALTH_CARE" | "ENDOWMENT";
  tagline?: string;
  premiumAmount: number;
  premiumFrequency: "monthly" | "annually";
  coverageAmount: number;
  isGuaranteedReturn?: boolean;
  projectedReturnRate?: string;
  surrenderPenaltyPeriodMonths?: number;
  surrenderPenaltyPercent?: number;
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

export interface ClientQuestionItem {
  id: string;
  question: string;
  advisorAnswer?: string;
  status: "ANSWERED" | "PENDING" | "NEEDS_CLARIFICATION";
  statusLabel: string;
  topic?: string;
  timestamp: string;
}

export interface SpeakerTurn {
  speaker: "AGENT" | "CLIENT";
  text: string;
  isQuestion?: boolean;
  topic?: string;
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
  conversationSummary?: string[];
  clientQuestions?: ClientQuestionItem[];
  speakerTurns?: SpeakerTurn[];
  coveredSectionIds?: number[];
  auditEngine?: "google-gemini-live" | "mas-regulatory-rules-fallback";
  modelUsed?: string;
  timestamp: string;
}

export interface ConfusionEvent {
  id: string;
  timestamp: string; // Clock time (e.g. "14:52:10")
  relativeSeconds: number; // Elapsed seconds into session/review (e.g. 84)
  triggerType: "BROW_FURROW" | "SQUINT_HESITATION" | "PUZZLED_TILT" | "MANUAL_PAUSE" | "HAND_TO_HEAD";
  intensity: "mild" | "moderate" | "high";
  activeTopic?: string; // Topic being discussed (e.g. "Early Surrender Penalty")
  speechSnippet?: string; // Spoken advisor statement or clause phrase at that moment
  clarificationNote?: string; // Statutory / plain-English resolution for the client
  durationSeconds?: number;
}

export interface GestureAgreement {
  nodDetected: boolean;
  nodConfidence: number; // 0.0 - 1.0
  shakeDetected: boolean;
  faceMatchScore?: number; // 0.0 - 1.0
  faceMatchPassed?: boolean;
  recapAgreedAt?: string;
}

export type ClientWorkflowStep =
  | "SESSION_OVERVIEW"       // Picture 1
  | "FACE_CALIBRATION"       // Picture 2
  | "LIVE_CONVERSATION"      // Picture 3 (Mic Only)
  | "REVIEW_BEFORE_SIGN"     // Recap with Face Match + Nod Detection + Signature
  | "SUBMISSION_SUCCESS";    // Customer-facing clean receipt

export interface LivenessTelemetry {
  passed: boolean;
  score: number;
  confusionDetected: boolean;
  confusionEventsCount: number;
  confusionScore?: number;
  timeSpentReviewingSeconds: number;
  timerFallbackTriggered: boolean;
  confusionEvents?: ConfusionEvent[];
  gestureAgreement?: GestureAgreement;
  calibratedFaceMeshAvailable?: boolean;
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
  masStatusLabel?: MasStatusLabel;
  fastTrackApproved: boolean;
  estimatedReviewDays: number; // 1 for Green, 3-4 for Yellow
  customerFacingStatus: "APPROVED_FAST_TRACK" | "SUBMITTED_FOR_REVIEW";
  customerFacingMessage: string;
  internalAuditNotes: string[];
  submittedAt: string;
  reasonCategory?: "CLEAN_PASS" | "AGENT_MISALIGNMENT" | "CUSTOMER_CONFUSION" | "COMPOUND_RISK" | "INVALID_SIGNATURE";
  confusionScore?: number;
  confusionCount?: number;
  confusionRatio?: number;
  totalPointsCount?: number;
  confusionThresholdScore?: number;
  livenessScore?: number;
}

export interface ComplianceCertificate {
  certificateId: string;
  certificateHash: string;
  sessionId: string;
  policy: {
    id: string;
    code: string;
    name: string;
    type: string;
    provider: string;
    premiumAmount: number;
    premiumFrequency: string;
    coverageAmount: number;
  };
  advisor: {
    agentId: string;
    repNumber: string;
    fullName: string;
    agencyFirm: string;
  };
  customer: {
    name: string;
    phone: string;
  };
  auditSummary: {
    overallFlag: ComplianceFlag;
    statusLabel?: MasStatusLabel;
    auditEngine: string;
    fastTrackApproved: boolean;
    slaTargetDays: number;
    statutoryActsAudited: string[];
    livenessScore: number;
    reviewTimeSeconds: number;
    confusionEventsCount: number;
  };
  confusionTimeline: ConfusionEvent[];
  signatureDataUrl?: string;
  signedAt: string;
  masRegistryDisclaimer: string;
}

export type SttEngineMode = "gemini-live" | "cloud" | "browser";

export type FocusState = "FOCUSED" | "ATTENTION_NEEDED" | "CONFUSED" | "CAMERA_OFF";

export interface SyncedClauseHighlight {
  topic: "WAITING_PERIOD" | "SURRENDER_PENALTY" | "GUARANTEED_RETURN" | "DUTY_OF_DISCLOSURE" | "COVERAGE" | "GENERAL";
  clauseId?: string;
  matchedText?: string;
  highlightTimestamp: string;
  advisorNote?: string;
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
  presentedTopic?: number;
  clientQuestion?: string;
  recordingConsent?: boolean;
  cameraConsent?: boolean;
  calibratedMesh?: number[];
  calibratedFaceImage?: string;
  syncedHighlight?: SyncedClauseHighlight;
  liveDialogueBuffer?: string;
  conversationSummary?: string[];
  clientQuestions?: ClientQuestionItem[];
  explainedSections?: number[];
  lastAiAnalysisTimestamp?: string;
  livenessTelemetry?: LivenessTelemetry;
  confusionEvents?: ConfusionEvent[];
  consentResult?: BranchingResult;
  signatureDataUrl?: string;
  createdAt: string;
  updatedAt: string;
  isOfflineCached?: boolean;
}
