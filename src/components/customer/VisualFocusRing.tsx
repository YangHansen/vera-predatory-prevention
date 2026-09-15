"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  CameraOff,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  BrainCircuit,
} from "lucide-react";
import type { FocusState, ConfusionEvent } from "@/types";

interface VisualFocusRingProps {
  onTelemetryUpdate?: (telemetry: {
    passed: boolean;
    score: number;
    confusionDetected: boolean;
    confusionEventsCount: number;
    timeSpentReviewingSeconds: number;
    timerFallbackTriggered: boolean;
    confusionEvents?: ConfusionEvent[];
  }) => void;
  reviewTimeSeconds: number;
  activeTopic?: string;
  activeSpeechSnippet?: string;
  onConfusionLogged?: (event: ConfusionEvent) => void;
}

export default function VisualFocusRing({
  onTelemetryUpdate,
  reviewTimeSeconds,
  activeTopic,
  activeSpeechSnippet,
  onConfusionLogged,
}: VisualFocusRingProps) {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [focusState, setFocusState] = useState<FocusState>("CAMERA_OFF");
  const [statusMessage, setStatusMessage] = useState<string>("Initializing camera check...");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [confusionCount, setConfusionCount] = useState<number>(0);
  const [confusionEvents, setConfusionEvents] = useState<ConfusionEvent[]>([]);
  const [attentiveSeconds, setAttentiveSeconds] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastStateChangeRef = useRef<number>(Date.now());
  const prevTelemetryRef = useRef<string>("");

  const activeTopicRef = useRef<string | undefined>(activeTopic);
  const activeSpeechSnippetRef = useRef<string | undefined>(activeSpeechSnippet);
  const reviewTimeSecondsRef = useRef<number>(reviewTimeSeconds);
  const lastConfusionTimestampRef = useRef<number>(0);
  const consecutiveConfusionFramesRef = useRef<number>(0);
  const consecutiveAwayFramesRef = useRef<number>(0);

  // Dynamic user-specific resting baseline calibration refs
  const baselineGlabellaRef = useRef<number>(0);
  const calibrationCountRef = useRef<number>(0);

  useEffect(() => {
    activeTopicRef.current = activeTopic;
  }, [activeTopic]);

  useEffect(() => {
    activeSpeechSnippetRef.current = activeSpeechSnippet;
  }, [activeSpeechSnippet]);

  useEffect(() => {
    reviewTimeSecondsRef.current = reviewTimeSeconds;
  }, [reviewTimeSeconds]);

  // Start Front-Facing Camera
  const startCamera = useCallback(async () => {
    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      console.warn("Camera API not available or supported in this environment");
      setCameraActive(false);
      setFocusState("CAMERA_OFF");
      setStatusMessage("Verified via Reading Timer");
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 320 },
          height: { ideal: 320 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraStream(stream);
      setCameraActive(true);
      setFocusState("FOCUSED");
      setStatusMessage("Focused & Attentive");
      calibrationCountRef.current = 0;
      baselineGlabellaRef.current = 0;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn("Video play error:", e));
      }
    } catch (err: any) {
      console.warn("Camera access declined or unavailable, falling back to verified timer:", err);
      setCameraActive(false);
      setFocusState("CAMERA_OFF");
      setStatusMessage("Verified via Reading Timer");
    }
  }, []);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
    setCameraActive(false);
    setFocusState("CAMERA_OFF");
    setStatusMessage("Camera Off — Verified via Reading Timer");
  }, []);

  // Callback ref to attach stream immediately as soon as video DOM node mounts
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
      }
      node.play().catch((e) => console.warn("Video play error:", e));
    }
  }, []);

  // Ensure camera stream is assigned to video element whenever stream changes or camera active state toggles
  useEffect(() => {
    const video = videoRef.current;
    if (video && cameraStream && cameraActive) {
      if (video.srcObject !== cameraStream) {
        video.srcObject = cameraStream;
      }
      video.play().catch((e) => console.warn("Video play error:", e));
    }
  }, [cameraStream, cameraActive]);

  // Request camera on mount and clean up on unmount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Helper to construct meaningful plain-English clarification for flagged confusion moments
  const getSafeguardClarification = (topic?: string): string => {
    const t = (topic || "").toUpperCase();
    if (t.includes("SURRENDER") || t.includes("PENALTY")) {
      return "Early surrender penalty of 15% applies only if policy is surrendered within the first 36 months. After 36 months, 100% of accumulated surrender value is preserved.";
    }
    if (t.includes("WAITING") || t.includes("PRE_EXISTING") || t.includes("CONDITION")) {
      return "Pre-existing health conditions carry a standard 12-month statutory waiting period before full coverage activates.";
    }
    if (t.includes("GUARANTEE") || t.includes("ANNUITY") || t.includes("RETURN")) {
      return "Guaranteed monthly annuity starts at age 62 for 20 years and is backed by the insurer's statutory guarantee fund under Singapore regulations.";
    }
    if (t.includes("DISCLOSURE") || t.includes("DUTY")) {
      return "Under Section 25(5) of the Insurance Act, you must answer all health disclosure questions honestly; non-disclosure could void a future claim.";
    }
    return "Statutory 14-day Free-Look period protects your rights. If anything is unclear, you can cancel within 14 days for a 100% full refund with zero fees.";
  };

  // Record a timestamped confusion event
  const recordConfusion = useCallback(
    (
      triggerType: "BROW_FURROW" | "SQUINT_HESITATION" | "PUZZLED_TILT" | "MANUAL_PAUSE",
      intensity: "mild" | "moderate" | "high" = "moderate"
    ) => {
      const now = Date.now();
      // Throttle new automatic confusion events to at most once every 25 seconds to avoid spamming
      if (now - lastConfusionTimestampRef.current < 25000) {
        return;
      }
      lastConfusionTimestampRef.current = now;

      const clockTime = new Date().toLocaleTimeString("en-SG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const relSec = reviewTimeSecondsRef.current;
      const topic = activeTopicRef.current || "Policy Terms Review";
      const snippet = activeSpeechSnippetRef.current || undefined;
      const clarification = getSafeguardClarification(topic);

      const event: ConfusionEvent = {
        id: `conf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: clockTime,
        relativeSeconds: relSec,
        triggerType,
        intensity,
        activeTopic: topic,
        speechSnippet: snippet,
        clarificationNote: clarification,
        durationSeconds: 3,
      };

      setConfusionCount((prev) => prev + 1);
      setConfusionEvents((prev) => [...prev, event]);
      setFocusState("CONFUSED");
      setStatusMessage("Puzzled Expression — Take Your Time");

      if (onConfusionLogged) {
        onConfusionLogged(event);
      }

      // Auto-revert back to FOCUSED after 3.8s if user relaxes
      setTimeout(() => {
        setFocusState((curr) => {
          if (curr === "CONFUSED") {
            setStatusMessage("Focused & Attentive");
            return "FOCUSED";
          }
          return curr;
        });
      }, 3800);
    },
    [onConfusionLogged]
  );

  // Help button for senior assistance or testing gesture response
  const triggerConfusionHelp = () => {
    recordConfusion("MANUAL_PAUSE", "mild");
  };

  // Periodic Face, Gaze & Confusion Evaluation Loop
  useEffect(() => {
    if (!cameraActive) return;

    let detector: any = null;
    if (typeof window !== "undefined" && "FaceDetector" in window) {
      try {
        detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      } catch (e) {
        detector = null;
      }
    }

    const interval = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const w = 160;
      const h = 120;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, w, h);

      try {
        // Step 1: Native Shape Detection API if available
        if (detector) {
          try {
            const faces = await detector.detect(canvas);
            if (!faces || faces.length === 0) {
              consecutiveAwayFramesRef.current++;
              if (consecutiveAwayFramesRef.current >= 2) {
                setFocusState("ATTENTION_NEEDED");
                setStatusMessage("No Face Detected — Face Camera");
              }
              return;
            }

            const face = faces[0];
            const bb = face.boundingBox;
            const cx = bb.x + bb.width / 2;
            const cy = bb.y + bb.height / 2;

            // Centering check: is face center near the frame boundaries?
            if (cx < w * 0.18 || cx > w * 0.82 || cy < h * 0.10 || cy > h * 0.90) {
              setFocusState("ATTENTION_NEEDED");
              setStatusMessage("Please Center Your Full Face");
              return;
            }

            // Check eye landmarks for head tilt / confusion
            const eyes = (face.landmarks || []).filter((l: any) => l.type === "eye");
            if (eyes.length >= 2) {
              const e1 = eyes[0].locations?.[0] || eyes[0];
              const e2 = eyes[1].locations?.[0] || eyes[1];
              const eyeDist = Math.hypot(e2.x - e1.x, e2.y - e1.y);
              const tilt = Math.abs(e2.y - e1.y) / (eyeDist || 1);

              if (tilt > 0.18) {
                consecutiveConfusionFramesRef.current++;
                if (consecutiveConfusionFramesRef.current >= 2) {
                  recordConfusion("PUZZLED_TILT", "moderate");
                  consecutiveConfusionFramesRef.current = 0;
                  return;
                }
              }
            }

            // Face detected & centered via native detector
            consecutiveAwayFramesRef.current = 0;
            consecutiveConfusionFramesRef.current = 0;
            setFocusState((curr) => {
              if (curr === "CONFUSED") return curr;
              if (curr !== "FOCUSED") {
                setStatusMessage("Focused & Attentive");
              }
              return "FOCUSED";
            });
            setAttentiveSeconds((prev) => prev + 1);
            return;
          } catch (detErr) {
            // Fall through to canvas computer vision pipeline
          }
        }

        // Step 2: Statistical Skin Cluster & Feature Analysis
        const frame = ctx.getImageData(0, 0, w, h);
        const data = frame.data;

        let skinPixels = 0;
        let totalX = 0;
        let totalY = 0;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
            const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
            const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

            // Robust multi-ethnicity human skin chrominance
            if (
              yVal > 30 &&
              cb >= 75 &&
              cb <= 135 &&
              cr >= 128 &&
              cr <= 180 &&
              r > g &&
              r - b >= 4
            ) {
              skinPixels++;
              totalX += x;
              totalY += y;
            }
          }
        }

        // Check A: Face Missing or Obstructed
        if (skinPixels < 300) {
          consecutiveAwayFramesRef.current++;
          if (consecutiveAwayFramesRef.current >= 2) {
            setFocusState("ATTENTION_NEEDED");
            setStatusMessage("No Face Detected — Face Camera");
          }
          return;
        }

        // Statistical Centroid
        const cx = totalX / skinPixels;
        const cy = totalY / skinPixels;

        // Check B: Face Centering (Only flag if center is shifted towards edges)
        if (cx < w * 0.18 || cx > w * 0.82) {
          consecutiveAwayFramesRef.current = 0;
          setFocusState("ATTENTION_NEEDED");
          setStatusMessage("Please Center Your Full Face");
          return;
        }

        // Step 3: Eye Sockets & Gaze Alignment
        const eyeY = Math.floor(Math.max(15, cy - 16));
        const leftX1 = Math.floor(Math.max(5, cx - 36));
        const leftX2 = Math.floor(Math.max(leftX1 + 10, cx - 8));
        const rightX1 = Math.floor(Math.min(w - 18, cx + 8));
        const rightX2 = Math.floor(Math.min(w - 5, cx + 36));

        let leftDarkest = 255;
        let leftIrisX = (leftX1 + leftX2) / 2;
        let leftIrisY = eyeY;

        for (let y = Math.max(0, eyeY - 8); y < Math.min(h, eyeY + 8); y++) {
          for (let x = leftX1; x < leftX2; x++) {
            const idx = (y * w + x) * 4;
            const b = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            if (b < leftDarkest) {
              leftDarkest = b;
              leftIrisX = x;
              leftIrisY = y;
            }
          }
        }

        let rightDarkest = 255;
        let rightIrisX = (rightX1 + rightX2) / 2;
        let rightIrisY = eyeY;

        for (let y = Math.max(0, eyeY - 8); y < Math.min(h, eyeY + 8); y++) {
          for (let x = rightX1; x < rightX2; x++) {
            const idx = (y * w + x) * 4;
            const b = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            if (b < rightDarkest) {
              rightDarkest = b;
              rightIrisX = x;
              rightIrisY = y;
            }
          }
        }

        // Gaze offset from socket centers
        const leftSocketMidX = (leftX1 + leftX2) / 2;
        const rightSocketMidX = (rightX1 + rightX2) / 2;
        const halfSocketW = (leftX2 - leftX1) / 2 || 1;

        const leftGazeOffset = Math.abs(leftIrisX - leftSocketMidX) / halfSocketW;
        const rightGazeOffset = Math.abs(rightIrisX - rightSocketMidX) / halfSocketW;

        if (leftGazeOffset > 0.78 || rightGazeOffset > 0.78) {
          consecutiveAwayFramesRef.current++;
          if (consecutiveAwayFramesRef.current >= 2) {
            setFocusState("ATTENTION_NEEDED");
            setStatusMessage("Please Look at the Screen");
          }
          return;
        }

        // Step 4: Confusion Detection (Dynamic Baseline Calibration)
        // Sample glabella region between eyebrows
        const glabX1 = Math.floor(Math.max(0, cx - 8));
        const glabX2 = Math.floor(Math.min(w, cx + 8));
        const glabY1 = Math.floor(Math.max(0, cy - 22));
        const glabY2 = Math.floor(Math.max(1, cy - 10));

        let glabGradientSum = 0;
        let glabPixels = 0;
        for (let y = glabY1; y < glabY2; y++) {
          for (let x = glabX1; x < glabX2 - 1; x++) {
            const idx1 = (y * w + x) * 4;
            const idx2 = (y * w + x + 1) * 4;
            const b1 = 0.299 * data[idx1] + 0.587 * data[idx1 + 1] + 0.114 * data[idx1 + 2];
            const b2 = 0.299 * data[idx2] + 0.587 * data[idx2 + 1] + 0.114 * data[idx2 + 2];
            glabGradientSum += Math.abs(b2 - b1);
            glabPixels++;
          }
        }
        const glabellaGrad = glabPixels > 0 ? glabGradientSum / glabPixels : 0;
        const headTilt = Math.abs(rightIrisY - leftIrisY) / (Math.abs(rightIrisX - leftIrisX) || 1);

        // Calibrate baseline over initial resting frames (first 6 cycles)
        if (calibrationCountRef.current < 6) {
          calibrationCountRef.current++;
          if (baselineGlabellaRef.current === 0) {
            baselineGlabellaRef.current = glabellaGrad;
          } else {
            baselineGlabellaRef.current = baselineGlabellaRef.current * 0.7 + glabellaGrad * 0.3;
          }
        }

        const baseline = baselineGlabellaRef.current || 25.0;

        // Genuine corrugator brow furrow creates pronounced vertical furrows significantly exceeding resting baseline
        const isDynamicBrowFurrow = glabellaGrad > 38.0 && glabellaGrad / baseline > 2.2;
        const isPronouncedTilt = headTilt > 0.34;

        if (isDynamicBrowFurrow || isPronouncedTilt) {
          consecutiveConfusionFramesRef.current++;
          if (consecutiveConfusionFramesRef.current >= 5) {
            recordConfusion(isDynamicBrowFurrow ? "BROW_FURROW" : "PUZZLED_TILT", "moderate");
            consecutiveConfusionFramesRef.current = 0;
            return;
          }
        } else {
          consecutiveConfusionFramesRef.current = 0;
        }

        // Passed all checks -> Client is Focused & Attentive
        consecutiveAwayFramesRef.current = 0;
        setFocusState((curr) => {
          if (curr === "CONFUSED") return curr;
          if (curr !== "FOCUSED") {
            setStatusMessage("Focused & Attentive");
          }
          return "FOCUSED";
        });
        setAttentiveSeconds((prev) => prev + 1);
      } catch (e) {
        // Ignore canvas read errors
      }
    }, 550);

    return () => clearInterval(interval);
  }, [cameraActive, recordConfusion]);

  // Push updated liveness telemetry up to parent page with memoized string comparison
  useEffect(() => {
    if (!onTelemetryUpdate) return;

    const passed = cameraActive
      ? focusState === "FOCUSED" || attentiveSeconds > 6
      : reviewTimeSeconds >= 10;
    const score = cameraActive ? Math.min(0.98, 0.75 + attentiveSeconds * 0.02) : 0.85;

    const telemetryPayload = {
      passed,
      score: Number(score.toFixed(2)),
      confusionDetected: confusionCount > 0,
      confusionEventsCount: confusionCount,
      timeSpentReviewingSeconds: reviewTimeSeconds,
      timerFallbackTriggered: !cameraActive,
      confusionEvents,
    };

    const serialized = JSON.stringify(telemetryPayload);
    if (prevTelemetryRef.current !== serialized) {
      prevTelemetryRef.current = serialized;
      onTelemetryUpdate(telemetryPayload);
    }
  }, [
    focusState,
    cameraActive,
    attentiveSeconds,
    confusionCount,
    confusionEvents,
    reviewTimeSeconds,
    onTelemetryUpdate,
  ]);

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />

      <div
        className={`flex items-center gap-3.5 bg-white p-3.5 rounded-2xl border transition-all duration-300 shadow-xs ${
          focusState === "CONFUSED"
            ? "border-blue-300 bg-blue-50/40"
            : focusState === "ATTENTION_NEEDED"
            ? "border-amber-300 bg-amber-50/30"
            : "border-slate-200"
        }`}
      >
        {/* Optical Camera Mirror Ring */}
        <div className="relative group shrink-0">
          <div
            className={`relative rounded-full overflow-hidden transition-all duration-300 flex items-center justify-center ${
              isExpanded ? "w-28 h-28 sm:w-32 sm:h-32" : "w-16 h-16 sm:w-20 sm:h-20"
            } ${
              focusState === "FOCUSED"
                ? "ring-4 ring-emerald-500 ring-offset-2 shadow-[0_0_15px_rgba(16,185,129,0.35)]"
                : focusState === "ATTENTION_NEEDED"
                ? "ring-4 ring-amber-500 ring-offset-2 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                : focusState === "CONFUSED"
                ? "ring-4 ring-blue-500 ring-offset-2 animate-pulse shadow-[0_0_18px_rgba(59,130,246,0.45)]"
                : "ring-2 ring-slate-300"
            }`}
          >
            {cameraActive ? (
              <video
                ref={setVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
                style={{ transform: "scaleX(-1)" }}
              />
            ) : (
              <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                <CameraOff className="w-5 h-5 mb-0.5 text-slate-400" />
                <span className="text-[9px] font-bold leading-tight">Timer Mode</span>
              </div>
            )}

            {cameraActive && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? "Minimize camera preview" : "Expand camera preview"}
                className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
              >
                {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            )}
          </div>

          <div
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm transition-colors ${
              focusState === "FOCUSED"
                ? "bg-emerald-600"
                : focusState === "ATTENTION_NEEDED"
                ? "bg-amber-500"
                : focusState === "CONFUSED"
                ? "bg-blue-600 animate-bounce"
                : "bg-slate-500"
            }`}
          >
            {focusState === "FOCUSED" ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : focusState === "ATTENTION_NEEDED" ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : focusState === "CONFUSED" ? (
              <BrainCircuit className="w-3.5 h-3.5" />
            ) : (
              <ShieldCheck className="w-3 h-3" />
            )}
          </div>
        </div>

        {/* Status Text & Controls */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Visual Focus & Facial Clarity Tracker
            </span>
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                focusState === "CONFUSED"
                  ? "bg-blue-500 animate-ping"
                  : focusState === "ATTENTION_NEEDED"
                  ? "bg-amber-500 animate-ping"
                  : "bg-emerald-500 animate-ping"
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs sm:text-sm font-bold truncate ${
                focusState === "FOCUSED"
                  ? "text-emerald-700"
                  : focusState === "ATTENTION_NEEDED"
                  ? "text-amber-700"
                  : focusState === "CONFUSED"
                  ? "text-blue-700"
                  : "text-slate-700"
              }`}
            >
              {statusMessage}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
            {cameraActive
              ? focusState === "CONFUSED"
                ? "We noticed you might be puzzled. Take your time to review or ask Andi."
                : focusState === "ATTENTION_NEEDED"
                ? "Please look at your screen to verify informed consent."
                : "Full face & gaze verified locally. Private & never saved."
              : "Camera off: verified via reading duration."}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {cameraActive ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                >
                  {isExpanded ? "Shrink mirror" : "Enlarge mirror"}
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 underline flex items-center gap-1"
                >
                  <CameraOff className="w-3 h-3" />
                  <span>Turn off</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
              >
                <Camera className="w-3 h-3" />
                <span>Enable Camera Ring</span>
              </button>
            )}

            <button
              type="button"
              onClick={triggerConfusionHelp}
              className="text-[10px] font-medium text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 transition-colors"
            >
              <HelpCircle className="w-3 h-3 text-blue-600" />
              <span>Need time / Unclear?</span>
            </button>

            {/* Quick Demo Simulator Toggle for Testing / Evaluation */}
            <button
              type="button"
              onClick={() => {
                if (focusState === "FOCUSED") {
                  setFocusState("ATTENTION_NEEDED");
                  setStatusMessage("Please Center Your Full Face (Simulated)");
                } else {
                  setFocusState("FOCUSED");
                  setStatusMessage("Focused & Attentive");
                }
              }}
              className="text-[10px] font-medium text-amber-700 hover:text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
              title="Toggle simulated partial face or away posture"
            >
              Test Alert
            </button>

            <button
              type="button"
              onClick={() => {
                recordConfusion("BROW_FURROW", "high");
              }}
              className="text-[10px] font-medium text-blue-700 hover:text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200"
              title="Trigger simulated puzzled expression with speech-linked timestamp"
            >
              Test Confusion
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
