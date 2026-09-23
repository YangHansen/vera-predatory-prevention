"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DemoSession,
  dashboardExamples,
  previewSession,
  getDemoSessions,
  saveDemoSession,
  sessionToView,
} from "@/lib/frontend-demo";
export function useDemoSession(id: string) {
  const live = id.startsWith("sess_");
  const [session, setSession] = useState<DemoSession | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const refresh = useCallback(async () => {
    try {
      if (live) {
        const response = await fetch(`/api/session/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || !data.success)
          throw new Error(data.error || "Session unavailable");
        setSession(sessionToView(data.session, data.policy));
      } else
        setSession(
          getDemoSessions().find((s) => s.id === id) ||
            (id === "preview"
              ? previewSession
              : dashboardExamples.find((s) => s.id === id) || null),
        );
      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Connection unavailable. Please retry.",
      );
    } finally {
      setReady(true);
    }
  }, [id, live]);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      await refresh();
      if (!disposed && live) timer = setTimeout(poll, 2000);
    };
    void poll();
    const listener = () => {
      void refresh();
    };
    if (!live) {
      window.addEventListener("storage", listener);
      window.addEventListener("vera-demo-update", listener);
    }
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener("storage", listener);
      window.removeEventListener("vera-demo-update", listener);
    };
  }, [refresh, live]);
  async function update(patch: Partial<DemoSession>) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    try {
      if (live) {
        const body: Record<string, unknown> = {};
        if (patch.phase)
          body.status = {
            welcome: "QR_GENERATED",
            conversation: "HANDED_OFF",
            review: "CUSTOMER_REVIEWING",
            signed: "SUBMITTED",
          }[patch.phase];
        if ("question" in patch) body.clientQuestion = patch.question || "";
        if (patch.presentedTopic !== undefined)
          body.presentedTopic = patch.presentedTopic;
        const response = await fetch(`/api/session/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok || !data.success)
          throw new Error(data.error || "Could not save changes");
        await refresh();
      } else {
        const current =
          getDemoSessions().find((s) => s.id === id) ||
          (id === "preview"
            ? previewSession
            : dashboardExamples.find((s) => s.id === id) || null);
        if (!current) return false;
        saveDemoSession({ ...current, ...patch });
      }
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes");
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { session, ready, update, error, busy, live, refresh };
}
