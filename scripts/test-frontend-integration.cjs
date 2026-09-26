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
  await patch({
    status: "HANDED_OFF",
    recordingConsent: true,
    cameraConsent: true,
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
  const result = await (
    await consent.POST(
      request("/api/consent/submit", {
        sessionId: id,
        signatureDataUrl: "data:image/png;base64,fixture",
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
  console.log(
    "PASS: backend session creation, client URL, permissions, questions, mirrored topic, review transition, consent result and missing-session handling.",
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
