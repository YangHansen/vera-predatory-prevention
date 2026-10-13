import type { Session } from "@/types";

export function isWorkspaceSession(session: Session) {
  return session.customerUrl?.includes("/client/") === true;
}
export function hasCompletedOnboarding(session: Session) {
  return session.recordingConsent === true && session.cameraConsent === true &&
    Boolean(session.calibratedMesh && session.calibratedMesh.length >= 14 &&
      session.calibratedMesh.every(Number.isFinite));
}
export function canEnterConversation(session: Session) {
  return hasCompletedOnboarding(session) && session.agentDisclosureConfirmed === true;
}
export function namesMatch(entered: string | undefined, expected: string | undefined) {
  const normalize = (value: string | undefined) =>
    (value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  return Boolean(normalize(expected)) && normalize(entered) === normalize(expected);
}
