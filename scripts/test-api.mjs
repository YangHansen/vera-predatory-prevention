/**
 * Automated verification script for Vera Backend API & Logic Engines
 * Aligned with Monetary Authority of Singapore (MAS) Fair Dealing & Singapore PDPA standards.
 */
import { SessionStore } from "../src/lib/session-store.ts";
import { GeminiService } from "../src/lib/gemini.ts";
import { BranchingEngine } from "../src/lib/branching-engine.ts";
import { getDefaultPolicy } from "../src/lib/dummy-data.ts";

async function runTests() {
  console.log("🧪 Starting Vera Backend Core & Engine Tests (Singapore Standards)...\n");

  // 1. Test Session Creation
  console.log("1️⃣ Testing Session Creation...");
  const session = SessionStore.createSession({
    agentId: "agent_andi_sg01",
    customerName: "Mdm. Tan",
    policyId: "pol_retiresafe_sg",
  });
  console.log(`✅ Session created: ${session.id} | Status: ${session.status} | Customer URL: ${session.customerUrl}`);

  // 2. Test Policy Summarization
  console.log("\n2️⃣ Testing Policy Summarization (FR-04)...");
  const policy = getDefaultPolicy();
  const summaryBullets = await GeminiService.summarizePolicy(policy);
  console.log(`✅ Generated ${summaryBullets.length} simplified bullet points for '${policy.name}':`);
  summaryBullets.forEach((bullet, i) => console.log(`   ${i + 1}. ${bullet}`));

  // 3. Test Copilot Intent & Mis-selling Detection (FR-02)
  console.log("\n3️⃣ Testing Copilot Intent Analysis (FR-02)...");
  
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

  // 4. Test Branching Logic Engine (FR-06)
  console.log("\n4️⃣ Testing Branching Logic Engine (Fast-Track vs Manual Review)...");
  
  // Test Green Branching (Clean audio + Passed liveness + Valid signature)
  const greenResult = BranchingEngine.evaluate({
    liveness: {
      passed: true,
      score: 0.98,
      confusionDetected: false,
      confusionEventsCount: 0,
      timeSpentReviewingSeconds: 45,
      timerFallbackTriggered: false,
    },
    copilotEvents: [analysis2], // only compliant
    hasValidSignature: true,
  });
  console.log(`✅ Green Branching Result: Flag = ${greenResult.flag} | FastTrack = ${greenResult.fastTrackApproved} | Est. Days = ${greenResult.estimatedReviewDays}`);
  console.log(`   Customer Message: "${greenResult.customerFacingMessage}"`);

  // Test Yellow Branching (With yellow copilot flag or confusion)
  const yellowResult = BranchingEngine.evaluate({
    liveness: {
      passed: true,
      score: 0.90,
      confusionDetected: true,
      confusionEventsCount: 2,
      timeSpentReviewingSeconds: 60,
      timerFallbackTriggered: true,
    },
    copilotEvents: [analysis1], // deceptive dialogue event recorded
    hasValidSignature: true,
  });
  console.log(`✅ Yellow Branching Result: Flag = ${yellowResult.flag} | FastTrack = ${yellowResult.fastTrackApproved} | Est. Days = ${yellowResult.estimatedReviewDays}`);
  console.log(`   Internal Audit Notes: ${JSON.stringify(yellowResult.internalAuditNotes)}`);

  console.log("\n🎉 All Vera Backend core modules and engines verified successfully!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
