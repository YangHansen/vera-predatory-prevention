import type { ClientQuestionItem } from "@/types";

export function reviewCameraMode(step: number, nodStep: number) {
  return step === 0 || step === nodStep ? "NOD_AND_VERIFY" : "FOCUS_MONITOR";
}

export function questionReviewTerms(questions: ClientQuestionItem[]) {
  return questions.flatMap((question) => {
    const answer = question.advisorAnswer?.trim() || (question.status === "ANSWERED"
      ? "Your agent marked this as discussed. No answer summary was saved."
      : "This question still needs an explanation from your agent.");
    // Keep longer explanations on separate screens in the mobile reading flow.
    const parts: string[] = [];
    let remaining = answer;
    while (remaining.length > 340) {
      const boundary = remaining.lastIndexOf(" ", 340);
      const end = boundary > 0 ? boundary : 340;
      parts.push(remaining.slice(0, end));
      remaining = remaining.slice(end).trimStart();
    }
    if (remaining) parts.push(remaining);
    return parts.map((part, i) => ({
      title: i === 0 ? "Your question" : "Your agent’s answer",
      body: i === 0 ? question.question : part,
      detail: i === 0 ? part : `Answer continued · ${i + 1} of ${parts.length}`,
      isQuestion: i === 0,
    }));
  });
}
