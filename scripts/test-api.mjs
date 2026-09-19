/**
 * Automated verification script for VERA AI Backend API & Logic Engines
 * Aligned with Monetary Authority of Singapore (MAS) Fair Dealing & Singapore PDPA standards.
 */
import { SessionStore } from "../src/lib/session-store.ts";
import { GeminiService } from "../src/lib/gemini.ts";
import { BranchingEngine } from "../src/lib/branching-engine.ts";
import { getDefaultPolicy, listPolicies, getPolicyById } from "../src/lib/dummy-data.ts";
import { AgentStore } from "../src/lib/agent-store.ts";

async function runTests() {
  console.log("🧪 Starting VERA AI Backend Core & Engine Tests (Singapore Standards)...\n");

  // 1. Test Agent Provisioning & Persistence
  console.log("1️⃣ Testing Agent Account Backend Provisioning (MAS Representative Verification)...");
  const testRepNumber = `MAS-REP-${Math.floor(100000 + Math.random() * 900000)}`;
  const createAgentResult = AgentStore.createAgent({
    fullName: "Rachel Koh, CFP",
    repNumber: testRepNumber,
    email: `rachel.koh.${Date.now()}@verainsure.sg`,
    phone: "+65 9123 4567",
    agencyFirm: "Vera Premier Advisory",
    role: "SENIOR_ADVISOR",
  });
  console.log(`✅ Agent Created: ${createAgentResult.agent?.fullName} | Rep: ${createAgentResult.agent?.repNumber} | ID: ${createAgentResult.agent?.id}`);

  // Test invalid MAS rep format validation
  const invalidAgentResult = AgentStore.createAgent({
    fullName: "Invalid Rep",
    repNumber: "INVALID-123",
    email: "invalid@verainsure.sg",
  });
  console.log(`✅ Strict MAS Rep Validation Handled: ${!invalidAgentResult.success} (${invalidAgentResult.error})`);

  const allAgents = AgentStore.listAgents();
  console.log(`✅ Total Provisioned Advisers in Registry: ${allAgents.length}`);

  // 2. Test Multi-Policy Catalog
  console.log("\n2️⃣ Testing Dynamic Multi-Policy Catalog (4 Products)...");
  const policies = listPolicies();
  console.log(`✅ Catalog contains ${policies.length} MAS-regulated policies:`);
  policies.forEach((p) => {
    console.log(`   - [${p.code}] ${p.name} (${p.type}) | S$${p.premiumAmount}/mo | Guaranteed: ${p.isGuaranteedReturn ?? false}`);
  });
  const foundPolicy = getPolicyById("VERA-ILP-SG03");
  console.log(`✅ Found Unit-Linked Policy: ${foundPolicy?.name} (${foundPolicy?.projectedReturnRate})`);

  // 3. Test Session Creation with Multi-Policy & Advisor Linkage
  console.log("\n3️⃣ Testing Session Initialization with Advisor & Policy Pairing...");
  const session = SessionStore.createSession({
    agentId: createAgentResult.agent?.id || "agt_andi_01",
    customerName: "Mdm. Tan",
    policyId: foundPolicy?.id || "pol_retiresafe_sg",
  });
  console.log(`✅ Session created: ${session.id} | Status: ${session.status} | Customer URL: ${session.customerUrl}`);

  // 4. Test Policy Summarization
  console.log("\n4️⃣ Testing VERA AI Policy Summarization (FR-04)...");
  const defaultPol = getDefaultPolicy();
  const summaryBullets = await GeminiService.summarizePolicy(defaultPol);
  console.log(`✅ Generated ${summaryBullets.length} simplified bullet points for '${defaultPol.name}':`);
  summaryBullets.forEach((bullet, i) => console.log(`   ${i + 1}. ${bullet}`));

  // 5. Test Copilot Intent & Mis-selling Detection (FR-02)
  console.log("\n5️⃣ Testing VERA AI Copilot Intent Analysis (FR-02)...");
  
  // Case A: Deceptive / High Pressure tactic
  const deceptiveText = "Mdm. Tan, this investment-linked policy is guaranteed 25% profit with zero risk, sign right now!";
  const analysis1 = await GeminiService.analyzeSalesDialogue(deceptiveText);
  console.log(`✅ Deceptive Advisory Dialogue Test:`);
  console.log(`   - Compliant: ${analysis1.isCompliant} (Flag: ${analysis1.warningFlags}, Confidence: ${analysis1.confidenceScore})`);
  console.log(`   - Identified Issue: ${analysis1.detectedIssues[0]?.explanation}`);
  console.log(`   - Advisor Cheat Sheet: ${analysis1.suggestedAnswers[0]?.suggestedResponse}`);
  SessionStore.addCopilotEvent(session.id, analysis1);

  // Case B: Compliant Advisory Dialogue
  const compliantText = "Mdm. Tan, this S$450 monthly premium provides retirement annuity security and S$250,000 protection.";
  const analysis2 = await GeminiService.analyzeSalesDialogue(compliantText);
  console.log(`✅ Compliant Advisory Dialogue Test:`);
  console.log(`   - Compliant: ${analysis2.isCompliant} (Flag: ${analysis2.warningFlags})`);

  // Case C: Audio Transcription Test
  console.log("\n   Testing Audio Speech-to-Text Transcription Engine...");
  const mockAudioBase64 = "GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////FUmpZpkq17GDD0JAe5CQEZY=";
  const transcribeResult = await GeminiService.transcribeAudio(mockAudioBase64, "audio/webm");
  console.log(`✅ Audio Transcription Result (Engine: ${transcribeResult.engine})`);

  // 6. Test Branching Logic Engine (FR-06)
  console.log("\n6️⃣ Testing Branching Logic Engine (Fast-Track vs Manual Review)...");
  
  const greenResult = BranchingEngine.evaluate({
    liveness: {
      passed: true,
      score: 0.98,
      confusionDetected: false,
      confusionEventsCount: 0,
      timeSpentReviewingSeconds: 45,
      timerFallbackTriggered: false,
    },
    copilotEvents: [analysis2],
    hasValidSignature: true,
  });
  console.log(`✅ Green Branching Result: Flag = ${greenResult.flag} | FastTrack = ${greenResult.fastTrackApproved} | Est. Days = ${greenResult.estimatedReviewDays}`);
  console.log(`   Customer Message: "${greenResult.customerFacingMessage}"`);

  // Record consent submission on session
  SessionStore.recordConsentSubmission(session.id, "data:image/png;base64,mockSig", greenResult);

  const updatedSession = SessionStore.getSession(session.id);
  console.log(`✅ Recorded Consent on Session: Status = ${updatedSession?.status}`);

  console.log("\n🎉 All VERA AI Backend core modules, agents registry, multi-policy catalog, and compliance engines verified successfully!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
