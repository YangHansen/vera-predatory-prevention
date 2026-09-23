"use client";
import { useEffect, useState } from "react";
import {
  DemoSession,
  previewSession,
  getDemoSessions,
  saveDemoSession,
} from "@/lib/frontend-demo";
export function useDemoSession(id: string) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => {
      setSession(
        getDemoSessions().find((s) => s.id === id) ||
          (id === "preview" ? previewSession : null),
      );
      setReady(true);
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("vera-demo-update", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("vera-demo-update", refresh);
    };
  }, [id]);
  function update(patch: Partial<DemoSession>) {
    const current =
      getDemoSessions().find((s) => s.id === id) ||
      (id === "preview" ? previewSession : null);
    if (!current) return false;
    try {
      saveDemoSession({ ...current, ...patch });
      setError("");
      return true;
    } catch {
      setError(
        "Unable to save this demo in your browser. Check your storage settings and try again.",
      );
      return false;
    }
  }
  return { session, ready, update, error };
}
