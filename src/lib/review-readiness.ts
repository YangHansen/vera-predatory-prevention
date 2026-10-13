import type { Policy } from "@/types";

export function hasReadAllTopics(readTopics: number[] | undefined, policy: Policy) {
  return Array.from({ length: policy.simplifiedSummary.length + 1 }, (_, i) => i)
    .every((i) => readTopics?.includes(i));
}

export function canBeginFinalReview(
  session: { conversationEndedAt?: string; readTopics?: number[] },
  policy: Policy,
) {
  return Boolean(session.conversationEndedAt) && hasReadAllTopics(session.readTopics, policy);
}
