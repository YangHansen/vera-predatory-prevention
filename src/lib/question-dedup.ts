import type { ClientQuestionItem } from "@/types";

/**
 * Normalizes question text by stripping punctuation, conversational filler prefixes,
 * and normalizing whitespace for semantic intent comparison.
 */
export function normalizeQuestionText(text: string): string {
  if (!text) return "";
  let clean = text.toLowerCase();
  clean = clean.replace(/["'“”‘’`]/g, "");
  clean = clean.replace(/[-_]/g, " ");
  clean = clean.replace(/[.,\/#!$%\^&\*;:{}=~()?]/g, " ");

  // Remove common spoken fillers and indirect enquiry prefixes
  const fillers = [
    /\bcan you explain\b/g,
    /\bcan you tell me\b/g,
    /\bcould you explain\b/g,
    /\bcould you tell me\b/g,
    /\bwhat does that mean exactly\b/g,
    /\bwhat does that mean\b/g,
    /\bwhat does it mean\b/g,
    /\bcan you explain it a bit\b/g,
    /\bcan you explain a bit\b/g,
    /\bis that right\b/g,
    /\bis that correct\b/g,
    /\bis it true\b/g,
    /\bor immediately\b/g,
    /\bwell\b/g,
    /\bbasically\b/g,
    /\bactually\b/g,
    /\bdo you know if\b/g,
    /\blet me know\b/g,
    /\bmay i know\b/g,
    /\bi want to know\b/g,
    /\bi want to ask\b/g,
  ];

  for (const f of fillers) {
    clean = clean.replace(f, " ");
  }

  return clean.replace(/\s+/g, " ").trim();
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "in", "on", "at", "to", "of", "for", "with",
  "by", "from", "up", "about", "into", "over", "after", "is", "are", "was", "were", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "i", "you", "he", "she",
  "it", "we", "they", "my", "your", "his", "her", "its", "our", "their", "this", "that",
  "these", "those", "me", "him", "them", "so", "then", "there", "here", "when", "where",
  "why", "how", "all", "any", "some"
]);

function stemToken(token: string): string {
  if (token === "paying" || token === "payments" || token === "payment" || token === "paid") return "pay";
  if (token === "canceled" || token === "cancelled" || token === "cancelling" || token === "cancellation" || token === "cancels") return "cancel";
  if (token === "monthly" || token === "months") return "month";
  if (token === "yearly" || token === "years" || token === "annual" || token === "annually") return "year";
  if (token === "ill" || token === "illness" || token === "sickness") return "sick";
  if (token === "returns" || token === "returned" || token === "refund" || token === "refunds") return "refund";
  return token;
}

export function extractKeyTokens(text: string): string[] {
  const norm = normalizeQuestionText(text);
  return norm
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map(stemToken);
}

/**
 * Determines whether two customer inquiries express the same underlying intent/concern
 * despite differences in tone, conversational fillers, or phrasing.
 */
export function areQuestionsSemanticallySimilar(q1: string, q2: string): boolean {
  if (!q1 || !q2) return false;
  const n1 = normalizeQuestionText(q1);
  const n2 = normalizeQuestionText(q2);
  if (n1 === n2) return true;

  const tokens1 = extractKeyTokens(q1);
  const tokens2 = extractKeyTokens(q2);
  if (tokens1.length === 0 || tokens2.length === 0) return false;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let intersectCount = 0;
  for (const t of set1) {
    if (set2.has(t)) intersectCount++;
  }

  const unionCount = new Set([...tokens1, ...tokens2]).size;
  const jaccard = unionCount > 0 ? intersectCount / unionCount : 0;
  const minLen = Math.min(set1.size, set2.size);
  const subsetRatio = minLen > 0 ? intersectCount / minLen : 0;

  // 1. High keyword overlap (Jaccard >= 0.55)
  if (jaccard >= 0.55) return true;

  // 2. High subset containment (e.g. short prompt vs elaborated question sharing >= 75% core keywords)
  if (subsetRatio >= 0.75 && minLen >= 3) return true;

  return false;
}

/**
 * Deduplicates and merges an incoming list of questions with an existing list,
 * preserving answer states, reviewer resolutions, and picking the cleanest canonical question.
 */
export function mergeClientQuestions(
  existing: ClientQuestionItem[],
  incoming: ClientQuestionItem[],
): ClientQuestionItem[] {
  const result: ClientQuestionItem[] = [...existing];

  for (const inQ of incoming) {
    const matchIdx = result.findIndex((curr) =>
      areQuestionsSemanticallySimilar(curr.question, inQ.question),
    );

    if (matchIdx >= 0) {
      const prev = result[matchIdx];
      const isAnswered = prev.status === "ANSWERED" || inQ.status === "ANSWERED";
      
      // Select canonical question text: prefer well-punctuated, cleaner wording
      const chooseBetterQuestion = (a: string, b: string) => {
        if (!a) return b;
        if (!b) return a;
        if (a.endsWith("?") && !b.endsWith("?")) return a;
        if (!a.endsWith("?") && b.endsWith("?")) return b;
        return a.length >= b.length ? a : b;
      };

      result[matchIdx] = {
        ...prev,
        ...inQ,
        id: prev.id, // preserve stable identity
        question: prev.status === "ANSWERED" ? prev.question : chooseBetterQuestion(prev.question, inQ.question),
        status: isAnswered ? "ANSWERED" : (inQ.status || prev.status),
        statusLabel: isAnswered ? "Reviewed" : (inQ.statusLabel || prev.statusLabel || "Needs explanation"),
        advisorAnswer: prev.resolvedByAgentAt ? prev.advisorAnswer : (inQ.advisorAnswer || prev.advisorAnswer),
        resolvedByAgentAt: prev.resolvedByAgentAt || inQ.resolvedByAgentAt,
        topic: inQ.topic || prev.topic,
      };
    } else {
      result.push({
        ...inQ,
        id: inQ.id || `q_${Date.now()}_${result.length}`,
        status: inQ.status || "PENDING",
        statusLabel: inQ.status === "ANSWERED" ? "Reviewed" : (inQ.statusLabel || "Needs explanation"),
      });
    }
  }

  return result;
}
