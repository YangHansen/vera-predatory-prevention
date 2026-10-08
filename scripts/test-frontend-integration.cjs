const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
const scoped = createRequire(require.resolve("tailwindcss"));
const jiti = scoped("jiti")(__filename, {
  alias: { "@": path.join(root, "src") },
  interopDefault: true,
});
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vera-integration-"));
process.env.GEMINI_API_KEY = "";
process.chdir(temp);
(async () => {
  const { NextRequest } = require("next/server");
  const sessions = jiti(path.join(root, "src/app/api/session/route.ts"));
  const detail = jiti(path.join(root, "src/app/api/session/[id]/route.ts"));
  const consent = jiti(path.join(root, "src/app/api/consent/submit/route.ts"));
  const { namesMatch, canEnterConversation } = jiti(path.join(root, "src/lib/session-workflow.ts"));
  const { questionReviewTerms, reviewCameraMode } = jiti(path.join(root, "src/lib/client-review.ts"));
  const { SessionStore } = jiti(path.join(root, "src/lib/session-store.ts"));
  // BUG-003: both camera checkpoints detect nods; reading stays in focus mode.
  assert.equal(reviewCameraMode(0, 8), "NOD_AND_VERIFY");
  assert.equal(reviewCameraMode(8, 8), "NOD_AND_VERIFY");
  assert.equal(reviewCameraMode(3, 8), "FOCUS_MONITOR");
  // BUG-005: case/spacing are harmless; missing or different names are rejected.
  assert.equal(namesMatch("  SITI   Aminah ", "Siti Aminah"), true);
  assert.equal(namesMatch("Siti", "Siti Aminah"), false);
  assert.equal(namesMatch("", ""), false);
  const { sessionToView } = jiti(path.join(root, "src/lib/frontend-demo.ts"));
  const request = (url, body, method = "POST") =>
    new NextRequest(`http://localhost:3000${url}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const created = await (
    await sessions.POST(
      request("/api/session", {
        customerName: "Integration fixture",
        clientExperience: "workspace",
      }),
    )
  ).json();
  assert.equal(created.success, true);
  const id = created.session.id;

  // Verify that different agents do not share sessions
  const sarahCreated = await (
    await sessions.POST(
      request("/api/session", {
        agentId: "agt_sarah_02",
        customerName: "Sarah Client Fixture",
      }),
    )
  ).json();
  assert.equal(sarahCreated.success, true);

  const andiList = await (
    await sessions.GET(new NextRequest("http://localhost:3000/api/session?agentId=agt_andi_01"))
  ).json();
  const sarahList = await (
    await sessions.GET(new NextRequest("http://localhost:3000/api/session?agentId=agt_sarah_02"))
  ).json();

  assert.equal(andiList.sessions.some((s) => s.id === sarahCreated.session.id), false);
  assert.equal(sarahList.sessions.some((s) => s.id === id), false);
  assert.equal(sarahList.sessions.some((s) => s.id === sarahCreated.session.id), true);

  const params = { params: Promise.resolve({ id }) };
  assert.equal(
    created.session.customerUrl,
    `http://localhost:3000/client/${id}`,
  );
  assert.equal(created.session.status, "QR_GENERATED");
  const patch = async (body) =>
    (
      await detail.PATCH(request(`/api/session/${id}`, body, "PATCH"), params)
    ).json();
  assert.equal((await patch({ endConversation: true })).success, false);
  assert.equal(sessionToView({ ...created.session, liveDialogueBuffer: "Agent preparation" }).phase, "welcome");
  // BUG-002/006: opening the link or saving dialogue cannot finish onboarding.
  assert.equal((await patch({ status: "HANDED_OFF" })).success, false);
  assert.equal((await patch({ status: "HANDED_OFF", recordingConsent: true, cameraConsent: true })).success, false);
  assert.equal((await patch({ dialogueBuffer: "Premature recording" })).success, false);
  const analyzeRoute = jiti(path.join(root, "src/app/api/copilot/analyze/route.ts"));
  assert.equal((await analyzeRoute.POST(request("/api/copilot/analyze", { sessionId: id, text: "Premature recording" }))).status, 409);
  await patch({
    status: "HANDED_OFF",
    recordingConsent: true,
    cameraConsent: true,
    calibratedMesh: Array(14).fill(0.5),
    agentDisclosureConfirmed: true,
    clientQuestion: "What are the costs?",
    presentedTopic: 2,
  });
  let response = await (
    await detail.GET(
      new NextRequest(`http://localhost:3000/api/session/${id}`),
      params,
    )
  ).json();
  let view = sessionToView(response.session, response.policy);
  assert.equal(view.phase, "conversation");
  assert.equal(view.question, "What are the costs?");
  assert.equal(view.presentedTopic, 2);
  assert.equal(view.backend.recordingConsent, true);
  assert.equal(canEnterConversation({ ...view.backend, agentDisclosureConfirmed: false }), false);
  assert.equal(canEnterConversation(view.backend), true);
  // BUG-007: resolve only the selected question and preserve it across AI updates.
  await patch({ clientQuestion: "Can I cancel?" });
  const questions = SessionStore.getSession(id).clientQuestions;
  const costQuestion = questions.find((q) => q.question === "What are the costs?");
  const cancelQuestion = questions.find((q) => q.question === "Can I cancel?");
  await patch({ resolveQuestionId: costQuestion.id, clientQuestion: "", advisorAnswer: "The premium is paid monthly." });
  let resolved = SessionStore.getSession(id).clientQuestions;
  assert.equal(resolved.find((q) => q.id === costQuestion.id).status, "ANSWERED");
  assert.equal(resolved.find((q) => q.id === cancelQuestion.id).status, "PENDING");
  SessionStore.addCopilotEvent(id, {
    isCompliant: true, warningFlags: "GREEN", confidenceScore: 0.8, detectedIssues: [], suggestedAnswers: [], timestamp: new Date().toISOString(),
    clientQuestions: [{ ...costQuestion, id: "changed-by-ai", status: "PENDING", advisorAnswer: "Overwritten answer" }]
  });
  resolved = SessionStore.getSession(id).clientQuestions;
  assert.equal(resolved.find((q) => q.id === costQuestion.id).status, "ANSWERED");
  assert.equal(resolved.find((q) => q.id === costQuestion.id).advisorAnswer, "The premium is paid monthly.");
  assert.equal(sessionToView(SessionStore.getSession(id), response.policy).question, "Can I cancel?");
  await patch({ resolveQuestionId: cancelQuestion.id, advisorAnswer: "The cancellation terms apply." });
  assert.equal(sessionToView(SessionStore.getSession(id), response.policy).question, undefined);
  // BUG-008: actual saved answers are in review steps, including long-answer pagination.
  const qa = questionReviewTerms(resolved);
  assert.equal(qa[0].body, "What are the costs?");
  assert.equal(qa[0].detail, "The premium is paid monthly.");
  assert.ok(questionReviewTerms([{ ...costQuestion, advisorAnswer: "Long explanation. ".repeat(100) }]).length > 1);
  assert.equal((await patch({ resolveQuestionId: "missing-question" })).success, false);
  assert.equal((await patch({ status: "CUSTOMER_REVIEWING" })).success, false);
  await patch({ endConversation: true });
  assert.equal((await patch({ status: "CUSTOMER_REVIEWING" })).success, false);
  const count = response.policy.simplifiedSummary.length + 1;
  assert.equal((await patch({ readTopics: [count] })).success, false);
  for (let i = 0; i < count - 1; i++) {
    await patch({ readTopics: [i] });
    assert.equal((await patch({ status: "CUSTOMER_REVIEWING" })).success, false);
  }
  await patch({ readTopics: [count - 1] });
  const beforeReview = await (await detail.GET(new NextRequest(`http://localhost:3000/api/session/${id}`), params)).json();
  assert.equal(beforeReview.session.status, "HANDED_OFF");
  assert.equal(beforeReview.session.readTopics.length, count);
  const { canBeginFinalReview } = jiti(path.join(root, "src/lib/review-readiness.ts"));
  assert.equal(canBeginFinalReview({ readTopics: beforeReview.session.readTopics }, response.policy), false);
  assert.equal(canBeginFinalReview(beforeReview.session, response.policy), true);
  const statusRoute = jiti(path.join(root, "src/app/api/session/[id]/status/route.ts"));
  assert.equal((await statusRoute.PATCH(request("/status", { status: "CUSTOMER_REVIEWING" }, "PATCH"), { params: Promise.resolve({ id: sarahCreated.session.id }) })).status, 409);
  const sarahParams = { params: Promise.resolve({ id: sarahCreated.session.id }) };
  const sarahPatch = (body) => detail.PATCH(request("/session", body, "PATCH"), sarahParams);
  await sarahPatch({ status: "HANDED_OFF" });
  await sarahPatch({ readTopics: Array.from({ length: count }, (_, i) => i) });
  assert.equal((await sarahPatch({ status: "CUSTOMER_REVIEWING" })).status, 409);
  await sarahPatch({ endConversation: true });
  assert.equal((await sarahPatch({ status: "CUSTOMER_REVIEWING" })).status, 200);
  await patch({ clientQuestion: "", status: "CUSTOMER_REVIEWING" });
  response = await (
    await detail.GET(
      new NextRequest(`http://localhost:3000/api/session/${id}`),
      params,
    )
  ).json();
  assert.equal(
    sessionToView(response.session, response.policy).phase,
    "review",
  );
  assert.equal((await consent.POST(request("/api/consent/submit", {
    sessionId: id, signedName: "Wrong Name", signatureDataUrl: "data:image/png;base64,fixture"
  }))).status, 400);
  const result = await (
    await consent.POST(
      request("/api/consent/submit", {
        sessionId: id,
        signatureDataUrl: "data:image/png;base64,fixture",
        signedName: " Integration   Fixture ",
        liveness: {
          passed: false,
          score: 0,
          confusionDetected: false,
          confusionEventsCount: 0,
          timeSpentReviewingSeconds: 15,
          timerFallbackTriggered: false,
        },
      }),
    )
  ).json();
  assert.equal(result.success, true);
  assert.equal(result.result.fastTrackApproved, false);
  assert.equal(sessionToView(result.session, response.policy).phase, "signed");
  assert.equal(
    sessionToView(
      { ...result.session, consentResult: undefined, status: "SUBMITTED" },
      response.policy,
    ).phase,
    "signed",
  );
  assert.equal(
    sessionToView(
      { ...result.session, consentResult: undefined, status: "SUBMITTED" },
      response.policy,
    ).status,
    "Completed",
  );
  const missing = await detail.GET(
    new NextRequest("http://localhost:3000/api/session/missing"),
    { params: Promise.resolve({ id: "missing" }) },
  );
  assert.equal(missing.status, 404);

  // Semantic question deduplication test (handles tone, rephrasings, fillers, hyphens)
  const { mergeClientQuestions } = jiti(path.join(root, "src/lib/question-dedup.ts"));
  const sampleVariations = [
    { question: "If I paid this premium for 10 years and I stay perfectly healthy, do I get any of my money back in the end?", status: "ANSWERED" },
    { question: "What does the 90-day waiting period mean? What if I get sick next month?", status: "PENDING" },
    { question: "What does the 90 day waiting period mean? What if I get sick next month?", status: "PENDING" },
    { question: "What happens if I lose my job and miss a monthly payment? Does the policy get canceled automatically?", status: "PENDING" },
    { question: "if I paid this premium for 10 years and I stay perfectly healthy Well I don't give any of my money back In the end is that right", status: "PENDING" },
    { question: "what does that mean exactly What if I get sick next month can you explain it a bit", status: "PENDING" },
    { question: "What happens if I lose my job and miss a monthly payment does the policy get canceled automatically or immediately", status: "PENDING" },
    { question: "If I paid this premium for 10 years and stay perfectly healthy, do I get any money back?", status: "PENDING" },
    { question: "What happens if I lose my job and miss a monthly payment?", status: "PENDING" },
  ];
  const deduplicated = mergeClientQuestions([], sampleVariations);
  assert.equal(deduplicated.length, 3, "9 phrasing/tone variations should deduplicate into exactly 3 core questions");
  assert.equal(deduplicated[0].status, "ANSWERED", "Preserves answered status");

  console.log(
    "PASS: session integration, onboarding/disclosure gates, both review gates, two camera modes, name validation, individual durable question resolution, Q&A review steps, and semantic tone deduplication.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    process.chdir(root);
    if (
      path.dirname(temp) === os.tmpdir() &&
      path.basename(temp).startsWith("vera-integration-")
    )
      fs.rmSync(temp, { recursive: true, force: true });
  });
