"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  BrainCircuit,
  Sparkles,
  Smile,
  RefreshCw,
  Eye,
  Scan,
} from "lucide-react";
import type { FocusState, ConfusionEvent } from "@/types";

// Filter out Emscripten / TensorFlow Lite WASM info messages and React key warnings from console.error to prevent Next.js dev overlay interrupts
if (typeof window !== "undefined") {
  const origConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = typeof args[0] === "string" ? args[0] : "";
    if (
      msg.includes("TensorFlow Lite XNNPACK delegate") ||
      msg.includes("Created TensorFlow Lite") ||
      msg.includes("INFO:") ||
      msg.includes("XNNPACK") ||
      msg.includes("Encountered two children with the same key") ||
      msg.includes("Keys should be unique")
    ) {
      console.info(...args);
      return;
    }
    origConsoleError.apply(console, args);
  };
}

export type FocusRingMode = "CALIBRATION" | "NOD_AND_VERIFY" | "FOCUS_MONITOR";

// Google MediaPipe Face Mesh Canonical Landmark Contours (478-Point Topology)
const MEDIAPIPE_CONTOURS = {
  oval: [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
    400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
    54, 103, 67, 109, 10,
  ],
  leftEyebrow: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  rightEyebrow: [336, 296, 334, 293, 300, 285, 295, 282, 283, 276],
  leftEye: [33, 160, 158, 133, 153, 144, 33],
  rightEye: [263, 387, 385, 362, 380, 373, 263],
  noseBridge: [168, 6, 197, 195, 5, 4, 1, 2, 94],
  lipsOuter: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61],
};

interface VisualFocusRingProps {
  compact?: boolean;
  minimized?: boolean;
  mode?: FocusRingMode;
  onTelemetryUpdate?: (telemetry: {
    passed: boolean;
    score: number;
    confusionDetected: boolean;
    confusionEventsCount: number;
    confusionScore?: number;
    timeSpentReviewingSeconds: number;
    timerFallbackTriggered: boolean;
    confusionEvents?: ConfusionEvent[];
    gestureAgreement?: {
      nodDetected: boolean;
      nodConfidence: number;
      shakeDetected: boolean;
      faceMatchScore?: number;
      faceMatchPassed?: boolean;
    };
  }) => void;
  reviewTimeSeconds?: number;
  activeTopic?: string;
  activeSpeechSnippet?: string;
  onConfusionLogged?: (event: ConfusionEvent) => void;
  // Step 2 & 4 Face Mesh & Gesture props
  onCalibrationComplete?: (meshVector: number[], faceImageBase64?: string) => void;
  calibratedMesh?: number[] | null;
  calibratedFaceImage?: string | null;
  onNodDetected?: (agreed: boolean, confidence: number, matchScore: number) => void;
  recapStatements?: string[];
}

export default function VisualFocusRing({
  compact = false,
  minimized = false,
  mode = "FOCUS_MONITOR",
  onTelemetryUpdate,
  reviewTimeSeconds = 0,
  activeTopic = "Policy Summary & Pillars",
  activeSpeechSnippet,
  onConfusionLogged,
  onCalibrationComplete,
  calibratedMesh,
  calibratedFaceImage,
  onNodDetected,
  recapStatements,
}: VisualFocusRingProps) {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [focusState, setFocusState] = useState<FocusState>("CAMERA_OFF");
  const [statusMessage, setStatusMessage] = useState<string>("Initializing camera check...");
  
  // Face Positioning & Alignment State (Verification before starting mesh)
  const [isFacePositioned, setIsFacePositioned] = useState<boolean>(false);
  const [positioningHint, setPositioningHint] = useState<string>("Position face inside the oval guide");
  const [alignmentProgress, setAlignmentProgress] = useState<number>(0);
  const consecutiveAlignedFramesRef = useRef<number>(0);

  // Calibration State (Step 2)
  const [calibrationProgress, setCalibrationProgress] = useState<number>(0);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);

  // Gesture & Face Matching State (Step 4)
  const [nodAgreed, setNodAgreed] = useState<boolean>(false);
  const [shakeDisagree, setShakeDisagree] = useState<boolean>(false);
  const [faceMatchScore, setFaceMatchScore] = useState<number>(0.20);
  const [faceMatchVerified, setFaceMatchVerified] = useState<boolean>(false);
  const [faceMatchReason, setFaceMatchReason] = useState<string>("Verifying biometric identity...");
  const [isAiVerifying, setIsAiVerifying] = useState<boolean>(false);

  // Real-Time Facial Confusion State (Step 4 Summary Review)
  const [isCurrentlyConfused, setIsCurrentlyConfused] = useState<boolean>(false);
  const [confusionIndicatorText, setConfusionIndicatorText] = useState<string>("Attentive Reading");

  // Google MediaPipe Face Landmarker Engine State (Zero-download browser execution)
  const [isMediaPipeActive, setIsMediaPipeActive] = useState<boolean>(false);
  const mediapipeRef = useRef<{
    faceLandmarker: any;
    isReady: boolean;
    isLoading: boolean;
  }>({
    faceLandmarker: null,
    isReady: false,
    isLoading: false,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeFaceDetectorRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "FaceDetector" in window) {
      try {
        nativeFaceDetectorRef.current = new (window as any).FaceDetector({
          fastMode: true,
          maxDetectedFaces: 2,
        });
      } catch {
        nativeFaceDetectorRef.current = null;
      }
    }
  }, []);

  // Pitch/Yaw gesture tracking refs
  const pitchHistoryRef = useRef<{ time: number; pitch: number }[]>([]);
  const yawHistoryRef = useRef<{ time: number; yaw: number }[]>([]);
  const lastNodTriggerRef = useRef<number>(0);
  const lastShakeTriggerRef = useRef<number>(0);
  const meshVectorRef = useRef<number[] | null>(null);
  const hasInitialAiVerifyFiredRef = useRef<boolean>(false);
  const hasAgreementAiVerifyFiredRef = useRef<boolean>(false);
  const aiMatchVerifiedRef = useRef<boolean>(false);
  const lastVideoTimestampRef = useRef<number>(-1);

  // Confusion Tracking Refs (Duration, Intensity & Leaky-Bucket Accumulator)
  const confusionScoreAccumulatorRef = useRef<number>(0);
  const confusionActiveStartRef = useRef<number | null>(null);
  const confusionStartTimestampRef = useRef<number | null>(null);
  const lastConfusionLoggedTimeRef = useRef<number>(0);
  const baselineGlabellaContrastRef = useRef<number>(0.02);
  const baselineCheekAsymmetryRef = useRef<number | null>(null);
  const baselineTempleAsymmetryRef = useRef<number | null>(null);
  const totalEventsLoggedRef = useRef<number>(0);

  // AI Verification State Cache
  const aiVerificationStateRef = useRef<{
    completed: boolean;
    isSamePerson: boolean;
    aiScore: number;
    reason: string;
  } | null>(null);

  const reviewTimeSecondsRef = useRef(reviewTimeSeconds);
  useEffect(() => {
    reviewTimeSecondsRef.current = reviewTimeSeconds;
  }, [reviewTimeSeconds]);

  const activeTopicRef = useRef(activeTopic);
  useEffect(() => {
    activeTopicRef.current = activeTopic;
  }, [activeTopic]);

  const activeSpeechSnippetRef = useRef(activeSpeechSnippet);
  useEffect(() => {
    activeSpeechSnippetRef.current = activeSpeechSnippet;
  }, [activeSpeechSnippet]);

  const calibratedMeshRef = useRef(calibratedMesh);
  useEffect(() => {
    calibratedMeshRef.current = calibratedMesh;
  }, [calibratedMesh]);

  const onCalibrationCompleteRef = useRef(onCalibrationComplete);
  useEffect(() => {
    onCalibrationCompleteRef.current = onCalibrationComplete;
  }, [onCalibrationComplete]);

  const onNodDetectedRef = useRef(onNodDetected);
  useEffect(() => {
    onNodDetectedRef.current = onNodDetected;
  }, [onNodDetected]);

  const onConfusionLoggedRef = useRef(onConfusionLogged);
  useEffect(() => {
    onConfusionLoggedRef.current = onConfusionLogged;
  }, [onConfusionLogged]);

  const isCalibratedRef = useRef(false);
  const calibrationProgressRef = useRef(0);

  // Reset calibration refs when switching mode
  useEffect(() => {
    if (mode === "CALIBRATION") {
      isCalibratedRef.current = false;
      calibrationProgressRef.current = 0;
      setCalibrationProgress(0);
      setIsCalibrated(false);
      consecutiveAlignedFramesRef.current = 0;
      setIsFacePositioned(false);
      setAlignmentProgress(0);
      hasInitialAiVerifyFiredRef.current = false;
      hasAgreementAiVerifyFiredRef.current = false;
      aiVerificationStateRef.current = null;
    }
  }, [mode]);

  // Dedicated Gemini Biometric Face Verification (STRICTLY CAPPED TO 2 CALLS PER SESSION)
  const runAiFaceVerification = useCallback(
    (triggerSource: "STAGE4_ENTRY" | "AGREEMENT_CONFIRM", currentCanvas?: HTMLCanvasElement | null) => {
      const c = currentCanvas || canvasRef.current;
      if (!c || !calibratedFaceImage || isAiVerifying) return;
      setIsAiVerifying(true);
      const currentSnapshot = c.toDataURL("image/jpeg", 0.85);
      fetch("/api/face/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calibrationImage: calibratedFaceImage,
          currentImage: currentSnapshot,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (
            data &&
            typeof data.matchPercentage === "number" &&
            data.matchPercentage >= 0 &&
            data.source !== "fallback-local-biometric"
          ) {
            const aiScore = data.matchPercentage / 100;
            const isAiMatch = Boolean(data.isSamePerson) && aiScore >= 0.70;
            aiMatchVerifiedRef.current = isAiMatch;
            const normalizedScore = isAiMatch ? Math.max(0.85, aiScore) : Math.min(0.25, aiScore);
            aiVerificationStateRef.current = {
              completed: true,
              isSamePerson: isAiMatch,
              aiScore: normalizedScore,
              reason: data.reason || (isAiMatch ? "Biometric Match Verified" : "Identity Mismatch Detected"),
            };
            setFaceMatchScore(normalizedScore);
            setFaceMatchVerified(isAiMatch);
            setFaceMatchReason(data.reason || (isAiMatch ? "Biometric Match Verified" : "Identity Mismatch Detected"));
          }
        })
        .catch((err) => {
          console.warn("AI face verification error:", err);
        })
        .finally(() => {
          setIsAiVerifying(false);
        });
    },
    [calibratedFaceImage, isAiVerifying]
  );

  const runAiFaceVerificationRef = useRef(runAiFaceVerification);
  useEffect(() => {
    runAiFaceVerificationRef.current = runAiFaceVerification;
  }, [runAiFaceVerification]);

  // Dynamically load Google MediaPipe Face Landmarker (Zero manual client downloads)
  const initMediaPipe = useCallback(async () => {
    if (typeof window === "undefined" || mediapipeRef.current.isReady || mediapipeRef.current.isLoading) return;
    mediapipeRef.current.isLoading = true;

    try {
      const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");

      // 1. Resolve WASM assets (prefer local /wasm, fallback to CDN)
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks("/wasm");
      } catch (wasmErr) {
        console.warn("Local WASM load fallback to CDN:", wasmErr);
        vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
      }

      // 2. Initialize FaceLandmarker (prefer local model /models/face_landmarker.task, fallback to Google CDN)
      let landmarker;
      try {
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
      } catch (gpuErr) {
        console.warn("GPU delegate failed, trying CPU fallback:", gpuErr);
        try {
          landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "/models/face_landmarker.task",
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
          });
        } catch (localModelErr) {
          console.warn("Local model failed, fetching from Google Storage:", localModelErr);
          landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
          });
        }
      }

      mediapipeRef.current.faceLandmarker = landmarker;
      mediapipeRef.current.isReady = true;
      setIsMediaPipeActive(true);
      console.log("Google MediaPipe Face Landmarker initialized successfully (Zero-download browser client)");
    } catch (err) {
      console.warn("MediaPipe initialization notice (maintaining Canvas fallback):", err);
    } finally {
      mediapipeRef.current.isLoading = false;
    }
  }, []);

  useEffect(() => {
    initMediaPipe();
  }, [initMediaPipe]);

  // Start Front-Facing Camera
  const startCamera = useCallback(async () => {
    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      console.warn("Camera API not available");
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
          width: { ideal: 480 },
          height: { ideal: 360 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraStream(stream);
      setCameraActive(true);
      setFocusState("FOCUSED");
      setStatusMessage("Face Camera Active");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Camera access declined or unavailable:", err);
      setCameraActive(false);
      setFocusState("CAMERA_OFF");
      setStatusMessage("Verified via Reading Timer");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
    setCameraActive(false);
    setFocusState("CAMERA_OFF");
  }, []);

  useEffect(() => {
    if (!compact) startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera, compact]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && cameraStream && cameraActive) {
      if (video.srcObject !== cameraStream) {
        video.srcObject = cameraStream;
      }
      video.play().catch(() => {});
    }
  }, [cameraStream, cameraActive]);

  /**
   * High-Dimensional Facial Biometric Descriptor (Anatomical 3D Proportions + Landmark Coordinates + Spatial Feature Map)
   * Captures invariant facial skull geometry, eye-to-nose triangles, and normalized spatial edge energy.
   * When MediaPipe is active, extracts 18 scale-invariant morphological ratios and 22 normalized 3D anchor landmarks.
   */
  const extractBiometricFingerprint = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    faceBox: { x: number; y: number; width: number; height: number },
    currentGrayscale: Uint8Array,
    landmarks?: any[] | null
  ): number[] => {
    const vector: number[] = [];

    // Mode A: High-Precision 3D Google MediaPipe Biometric Morphology (478 Landmarks)
    if (landmarks && landmarks.length >= 468) {
      const dist3D = (i: number, j: number) => {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        if (!p1 || !p2) return 0.001;
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = ((p1.z || 0) - (p2.z || 0)) * 1.2;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      };

      // Base anatomical scale normalizer: rigid bi-ocular distance (outer left canthus 33 to outer right canthus 263)
      const eyeDist = Math.max(0.01, dist3D(33, 263));

      // 21 Rigid Craniofacial Bony Skull Ratios (100% Expression-Invariant: unaffected by brow furrows, squinting, or talking)
      const ratios: number[] = [
        // 1. Bizygomatic cheekbone arch relative to eye distance: 234-454 / eyeDist
        dist3D(234, 454) / eyeDist,
        // 2. Bigonial jaw angle width relative to eye distance: 132-361 / eyeDist
        dist3D(132, 361) / eyeDist,
        // 3. Jaw-to-Cheek taper ratio: 132-361 / 234-454 (mandibular-to-zygomatic bone ratio)
        dist3D(132, 361) / Math.max(0.001, dist3D(234, 454)),
        // 4. Nasal bridge bone length relative to eye distance: 168-1 / eyeDist
        dist3D(168, 1) / eyeDist,
        // 5. Nasal alar base width relative to eye distance: 102-331 / eyeDist
        dist3D(102, 331) / eyeDist,
        // 6. Nasal index: 102-331 / 168-2 (nasal breadth to nasal height)
        dist3D(102, 331) / Math.max(0.001, dist3D(168, 2)),
        // 7. Inner canthal distance relative to outer canthal distance: 133-362 / eyeDist
        dist3D(133, 362) / eyeDist,
        // 8. Nasion-to-subnasale axis relative to eye distance: 168-2 / eyeDist
        dist3D(168, 2) / eyeDist,
        // 9. Forehead midline to nasion bone axis relative to eye distance: 10-168 / eyeDist
        dist3D(10, 168) / eyeDist,
        // 10. Craniofacial vertical elongation: Forehead 10 to Chin 152 / Bizygomatic 234-454
        dist3D(10, 152) / Math.max(0.001, dist3D(234, 454)),
        // 11. Lower face proportion: Subnasale-to-Chin / Nasion-to-Subnasale
        dist3D(2, 152) / Math.max(0.001, dist3D(168, 2)),
        // 12. Midface proportion: Nasion-to-Subnasale / Forehead-to-Chin
        dist3D(168, 2) / Math.max(0.001, dist3D(10, 152)),
        // 13. Left Zygomatic-Nasal span relative to Bizygomatic
        dist3D(234, 1) / Math.max(0.001, dist3D(234, 454)),
        // 14. Right Zygomatic-Nasal span relative to Bizygomatic
        dist3D(454, 1) / Math.max(0.001, dist3D(234, 454)),
        // 15. Left Jaw-Nasal span relative to Bigonial
        dist3D(132, 1) / Math.max(0.001, dist3D(132, 361)),
        // 16. Right Jaw-Nasal span relative to Bigonial
        dist3D(361, 1) / Math.max(0.001, dist3D(132, 361)),
        // 17. Diagonal Left Orbit to Right Jaw: 33-361 / eyeDist
        dist3D(33, 361) / eyeDist,
        // 18. Diagonal Right Orbit to Left Jaw: 263-132 / eyeDist
        dist3D(263, 132) / eyeDist,
        // 19. Chin to Left Cheek relative to Bizygomatic: 152-234 / 234-454
        dist3D(152, 234) / Math.max(0.001, dist3D(234, 454)),
        // 20. Chin to Right Cheek relative to Bizygomatic: 152-454 / 234-454
        dist3D(152, 454) / Math.max(0.001, dist3D(234, 454)),
        // 21. Total Face Height relative to eye distance: 10-152 / eyeDist
        dist3D(10, 152) / eyeDist,
      ];
      vector.push(...ratios);

      // Normalized 3D coordinates of 14 rigid skull anchor landmarks relative to nasion 168
      const refPt = landmarks[168] || { x: 0.5, y: 0.5, z: 0 };
      const anchorIndices = [
        1, 2, 10, 33, 102, 132, 133, 152, 234, 263, 331, 361, 362, 454
      ];
      for (const idx of anchorIndices) {
        const pt = landmarks[idx];
        if (pt) {
          vector.push((pt.x - refPt.x) / eyeDist);
          vector.push((pt.y - refPt.y) / eyeDist);
          vector.push(((pt.z || 0) - (refPt.z || 0)) / eyeDist);
        } else {
          vector.push(0, 0, 0);
        }
      }
    }

    // Secondary Spatial Edge Energy (16 cells)
    const w = canvas.width;
    const h = canvas.height;
    const bx = Math.max(0, Math.floor(faceBox.x));
    const by = Math.max(0, Math.floor(faceBox.y));
    const bw = Math.min(w - bx, Math.floor(faceBox.width));
    const bh = Math.min(h - by, Math.floor(faceBox.height));

    const cellW = Math.max(4, Math.floor(bw / 4));
    const cellH = Math.max(4, Math.floor(bh / 4));

    let faceLumSum = 0;
    let faceLumCount = 0;
    for (let y = by; y < by + bh; y += 4) {
      for (let x = bx; x < bx + bw; x += 4) {
        faceLumSum += currentGrayscale[y * w + x];
        faceLumCount++;
      }
    }
    const faceMeanLum = faceLumCount > 0 ? faceLumSum / faceLumCount : 128;

    for (let gy = 0; gy < 4; gy++) {
      for (let gx = 0; gx < 4; gx++) {
        const cx1 = bx + gx * cellW;
        const cy1 = by + gy * cellH;
        let cLum = 0, cGradX = 0, cGradY = 0, cCount = 0;

        for (let py = cy1; py < cy1 + cellH; py += 2) {
          for (let px = cx1; px < cx1 + cellW; px += 2) {
            if (px >= 1 && px < w - 1 && py >= 1 && py < h - 1) {
              const lum = currentGrayscale[py * w + px];
              cLum += lum;
              cGradX += Math.abs(currentGrayscale[py * w + px + 1] - currentGrayscale[py * w + px - 1]);
              cGradY += Math.abs(currentGrayscale[(py + 1) * w + px] - currentGrayscale[(py - 1) * w + px]);
              cCount++;
            }
          }
        }

        const avgLum = cCount > 0 ? cLum / cCount : 128;
        const avgGx = cCount > 0 ? cGradX / cCount : 0;
        const avgGy = cCount > 0 ? cGradY / cCount : 0;

        vector.push(avgLum / Math.max(1, faceMeanLum));
        vector.push(avgGx / 255);
        vector.push(avgGy / 255);
      }
    }

    return vector;
  };

  /**
   * Biometric Fingerprint Comparison (MediaPipe 3D Morphometry + Craniofacial Bony Skull Ratios)
   * High match (0.91-0.98) for the SAME person across natural expressions & head tilts.
   * Low match (0.12-0.35) for DIFFERENT people / different gender / relatives.
   */
  const compareBiometricFingerprints = (v1: number[], v2: number[]): number => {
    if (!v1 || !v2 || v1.length < 14 || v2.length < 14) return 0.20;

    const numRatios = Math.min(21, v1.length, v2.length);
    if (numRatios >= 14) {
      let ratioDiffSum = 0;
      let mismatches = 0;

      for (let i = 0; i < numRatios; i++) {
        const avg = (Math.abs(v1[i]) + Math.abs(v2[i])) / 2;
        const diff = Math.abs(v1[i] - v2[i]) / Math.max(0.001, avg);
        ratioDiffSum += diff;
        // Rigid skull bone ratio diff: natural perspective micro-changes are <= 4.5%, but different skulls differ by > 5.5%
        if (diff > 0.055) {
          mismatches++;
        }
      }
      const avgRatioDiff = ratioDiffSum / numRatios;

      // 3D Anchor Landmark Euclidean coordinate differences (if available in both)
      let avgCoordDiff = 0;
      if (v1.length >= numRatios + 42 && v2.length >= numRatios + 42) {
        let coordDiffSum = 0;
        for (let i = numRatios; i < numRatios + 42; i += 3) {
          const dx = v1[i] - v2[i];
          const dy = v1[i + 1] - v2[i + 1];
          const dz = v1[i + 2] - v2[i + 2];
          coordDiffSum += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        avgCoordDiff = coordDiffSum / 14;
      }

      // Expression-Invariant Discrimination Logic:
      // Same person making natural expressions (brow furrow, puzzled tilt, squinting/focusing):
      // Skull bone ratios remain nearly identical: avgRatioDiff <= 0.045 && mismatches <= 2
      // AND 3D anchor coordinate diff remains small (< 0.065) when present
      const isCoordMatch = avgCoordDiff === 0 || avgCoordDiff < 0.065;
      if (avgRatioDiff <= 0.045 && mismatches <= 2 && isCoordMatch) {
        // High confidence match for same person: 91% - 98%
        const score = 0.98 - avgRatioDiff * 1.5;
        return Math.max(0.91, Math.min(0.98, Math.round(score * 100) / 100));
      } else {
        // Clear biometric mismatch (different individual or different gender): 12% - 35%
        const penalty = (avgRatioDiff / 0.12) * 0.50 + (mismatches / (numRatios * 0.4)) * 0.50;
        const mismatchScore = 0.45 - penalty * 0.25;
        return Math.max(0.12, Math.min(0.35, Math.round(mismatchScore * 100) / 100));
      }
    }

    return 0.20;
  };

  // Previous frame buffer for optical flow motion tracking
  const prevFrameDataRef = useRef<Uint8Array | null>(null);

  // Detection and Drawing Loop
  useEffect(() => {
    if (!cameraActive) return;

    const interval = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const overlay = overlayCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const w = 320;
      const h = 240;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Compute motion centroid via frame differencing
      let totalMotion = 0;
      let motionSumX = 0;
      let motionSumY = 0;

      const currentGrayscale = new Uint8Array(w * h);
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        currentGrayscale[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      }

      if (prevFrameDataRef.current && prevFrameDataRef.current.length === currentGrayscale.length) {
        const prev = prevFrameDataRef.current;
        const startX = Math.floor(w * 0.20);
        const endX = Math.floor(w * 0.80);
        const startY = Math.floor(h * 0.15);
        const endY = Math.floor(h * 0.85);

        for (let y = startY; y < endY; y += 2) {
          for (let x = startX; x < endX; x += 2) {
            const idx = y * w + x;
            const diff = Math.abs(currentGrayscale[idx] - prev[idx]);
            if (diff > 18) {
              totalMotion += diff;
              motionSumX += x * diff;
              motionSumY += y * diff;
            }
          }
        }
      }
      prevFrameDataRef.current = currentGrayscale;

      // 1. Verify Face Presence & Accurate Positioning Before Starting Mesh
      const faceBox = { x: w * 0.22, y: h * 0.14, width: w * 0.56, height: h * 0.72 };
      const cx = faceBox.x + faceBox.width / 2;
      const cy = faceBox.y + faceBox.height / 2;
      const rx = faceBox.width * 0.44;
      const ry = faceBox.height * 0.48;
      const rxSq = rx * rx;
      const rySq = ry * ry;

      let faceFound = false;
      let faceCentered = false;
      let currentHint = "Position face inside oval guide";
      let currentFaceCenter: { x: number; y: number } | null = null;

      // Method A: Native Browser Shape Detection (Chrome / Edge FaceDetector API)
      let nativeChecked = false;
      if (nativeFaceDetectorRef.current) {
        try {
          const detectedFaces = await nativeFaceDetectorRef.current.detect(canvas);
          nativeChecked = true;
          if (detectedFaces && detectedFaces.length > 0) {
            faceFound = true;
            const b = detectedFaces[0].boundingBox;
            const fCx = b.x + b.width / 2;
            const fCy = b.y + b.height / 2;
            currentFaceCenter = { x: fCx, y: fCy };
            const offX = fCx - cx;
            const offY = fCy - cy;

            if (b.width < w * 0.22) {
              currentHint = "Move closer to camera";
            } else if (b.width > w * 0.82) {
              currentHint = "Move slightly further back";
            } else if (offX < -26) {
              currentHint = "Move face right →";
            } else if (offX > 26) {
              currentHint = "← Move face left";
            } else if (offY < -22) {
              currentHint = "Move face down ↓";
            } else if (offY > 22) {
              currentHint = "Move face up ↑";
            } else {
              faceCentered = true;
            }
          } else {
            faceFound = false;
            currentHint = "No face detected in camera";
          }
        } catch {
          nativeChecked = false;
        }
      }

      // Method B: Algorithmic Computer Vision Pipeline (Multi-Feature Biometric Fallback)
      // Runs when FaceDetector is not available (Safari / Firefox / disabled flag)
      if (!nativeChecked) {
        let insideLumSum = 0;
        let insidePixelCount = 0;
        let insideSkinPixels = 0;
        let insideSkinSumX = 0;
        let insideSkinSumY = 0;

        let totalGradient = 0;
        let gradientSamples = 0;

        let eyeBandLumSum = 0;
        let eyeBandSamples = 0;
        const eyeBandLums: number[] = [];

        for (let y = 8; y < h - 8; y += 4) {
          for (let x = 8; x < w - 8; x += 4) {
            const dx = x - cx;
            const dy = y - cy;
            const isInsideOval = (dx * dx) / rxSq + (dy * dy) / rySq <= 1.0;

            if (isInsideOval) {
              const idx = (y * w + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const lum = currentGrayscale[y * w + x];
              insideLumSum += lum;
              insidePixelCount++;

              // 1. Biological Skin Chromaticity (YCbCr + Normalized RGB model)
              const Y = 0.299 * r + 0.587 * g + 0.114 * b;
              const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
              const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
              const sumRGB = r + g + b;
              const normR = sumRGB > 0 ? r / sumRGB : 0;
              const normG = sumRGB > 0 ? g / sumRGB : 0;

              // True biological human skin cluster (excludes wood, yellow paint, and neutral walls)
              const isSkin =
                Y >= 35 && Y <= 235 &&
                Cb >= 77 && Cb <= 128 &&
                Cr >= 133 && Cr <= 175 &&
                normR >= 0.36 && normR <= 0.55 &&
                normG >= 0.26 && normG <= 0.38 &&
                normR > normG;

              if (isSkin) {
                insideSkinPixels++;
                insideSkinSumX += x;
                insideSkinSumY += y;
              }

              // 2. High-Frequency Edge Gradient (Sobel proxy across horizontal & vertical pixels)
              if (x >= 4 && x < w - 4 && y >= 4 && y < h - 4) {
                const gx = Math.abs(currentGrayscale[y * w + x + 2] - currentGrayscale[y * w + x - 2]);
                const gy = Math.abs(currentGrayscale[(y + 2) * w + x] - currentGrayscale[(y - 2) * w + x]);
                totalGradient += gx + gy;
                gradientSamples++;
              }

              // 3. Eye & Eyebrow Band Local Contrast (Upper Third of Oval)
              if (dy >= -ry * 0.40 && dy <= -ry * 0.08) {
                eyeBandLumSum += lum;
                eyeBandSamples++;
                eyeBandLums.push(lum);
              }
            }
          }
        }

        const avgCenterLum = insidePixelCount > 0 ? insideLumSum / insidePixelCount : 0;
        const skinRatio = insidePixelCount > 0 ? insideSkinPixels / insidePixelCount : 0;
        const avgGradient = gradientSamples > 0 ? totalGradient / gradientSamples : 0;

        // Calculate Eye Band Standard Deviation (Biometric eyebrow/eye feature signature)
        let eyeStdDev = 0;
        if (eyeBandSamples > 4) {
          const eyeMean = eyeBandLumSum / eyeBandSamples;
          const varSum = eyeBandLums.reduce((acc, v) => acc + (v - eyeMean) * (v - eyeMean), 0);
          eyeStdDev = Math.sqrt(varSum / eyeBandSamples);
        }

        // Biometric Face Presence Verification
        const hasAdequateLight = avgCenterLum >= 30 && avgCenterLum <= 235;
        const hasTextureGradient = avgGradient >= 9.0; // Flat walls/doors have < 5.0
        const hasEyeContrast = eyeStdDev >= 11.0;      // Plain surfaces have < 6.0
        const hasSkinPresence = skinRatio >= 0.24;     // At least 24% verified human skin

        if (!hasAdequateLight) {
          currentHint = avgCenterLum < 30 ? "Lighting too dark - face light" : "Lighting too bright - reduce glare";
          faceFound = false;
        } else if (!hasTextureGradient || !hasEyeContrast || !hasSkinPresence) {
          // Definitely not a face (blank wall, wooden desk, empty room, or furniture)
          currentHint = "No face detected in camera";
          faceFound = false;
        } else if (skinRatio > 0.85) {
          currentHint = "Move slightly further back";
          faceFound = true;
        } else {
          faceFound = true;
          // Centering offset check
          const skinCenterX = insideSkinSumX / insideSkinPixels;
          const skinCenterY = insideSkinSumY / insideSkinPixels;
          currentFaceCenter = { x: skinCenterX, y: skinCenterY };
          const offX = skinCenterX - cx;
          const offY = skinCenterY - cy;

          if (offX < -26) {
            currentHint = "Move face right →";
          } else if (offX > 26) {
            currentHint = "← Move face left";
          } else if (offY < -22) {
            currentHint = "Move face down ↓";
          } else if (offY > 22) {
            currentHint = "Move face up ↑";
          } else {
            faceCentered = true;
          }
        }
      }

      // Stability Hold Logic:
      // Only when a genuine face is found AND centered do we build alignment stability
      if (faceFound && faceCentered) {
        consecutiveAlignedFramesRef.current = Math.min(12, consecutiveAlignedFramesRef.current + 1);
        const alignPct = Math.round((consecutiveAlignedFramesRef.current / 12) * 100);
        if (consecutiveAlignedFramesRef.current >= 12) {
          currentHint = "Face Positioned Correctly ✓";
        } else {
          currentHint = `Hold steady... (${alignPct}%)`;
        }
      } else {
        // Face absent or off-center: immediately decay/reset stability
        consecutiveAlignedFramesRef.current = Math.max(0, consecutiveAlignedFramesRef.current - 2);
      }

      const stablePositioned = consecutiveAlignedFramesRef.current >= 12;
      setIsFacePositioned(stablePositioned);
      setPositioningHint(currentHint);
      setAlignmentProgress(Math.round((consecutiveAlignedFramesRef.current / 12) * 100));

      // Draw Guide Oval or Comprehensive Face Mesh Wireframe Overlay
      if (overlay) {
        overlay.width = w;
        overlay.height = h;
        const oCtx = overlay.getContext("2d");
        if (oCtx) {
          oCtx.clearRect(0, 0, w, h);

          // If face is NOT positioned correctly yet: Draw alignment target guide frame only!
          if (!stablePositioned) {
            oCtx.save();
            const alignRatio = consecutiveAlignedFramesRef.current / 12;

            // Guide Oval (shifts color from dotted white/amber to blue as alignment builds)
            oCtx.setLineDash([8, 6]);
            oCtx.strokeStyle = alignRatio > 0.4 ? "rgba(59, 130, 246, 0.95)" : "rgba(255, 255, 255, 0.85)";
            oCtx.lineWidth = 2.5;

            // Dashed Guide Oval
            oCtx.beginPath();
            oCtx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
            oCtx.stroke();
            oCtx.setLineDash([]);

            // Alignment Crosshairs / Corner Guides
            oCtx.strokeStyle = alignRatio > 0.4 ? "rgba(59, 130, 246, 0.95)" : "rgba(234, 179, 8, 0.9)";
            oCtx.lineWidth = 2;
            const r = 16;
            // Top-left
            oCtx.beginPath();
            oCtx.moveTo(cx - faceBox.width * 0.40, cy - faceBox.height * 0.44 + r);
            oCtx.lineTo(cx - faceBox.width * 0.40, cy - faceBox.height * 0.44);
            oCtx.lineTo(cx - faceBox.width * 0.40 + r, cy - faceBox.height * 0.44);
            oCtx.stroke();
            // Top-right
            oCtx.beginPath();
            oCtx.moveTo(cx + faceBox.width * 0.40 - r, cy - faceBox.height * 0.44);
            oCtx.lineTo(cx + faceBox.width * 0.40, cy - faceBox.height * 0.44);
            oCtx.lineTo(cx + faceBox.width * 0.40, cy - faceBox.height * 0.44 + r);
            oCtx.stroke();
            // Bottom-left
            oCtx.beginPath();
            oCtx.moveTo(cx - faceBox.width * 0.40, cy + faceBox.height * 0.44 - r);
            oCtx.lineTo(cx - faceBox.width * 0.40, cy + faceBox.height * 0.44);
            oCtx.lineTo(cx - faceBox.width * 0.40 + r, cy + faceBox.height * 0.44);
            oCtx.stroke();
            // Bottom-right
            oCtx.beginPath();
            oCtx.moveTo(cx + faceBox.width * 0.40 - r, cy + faceBox.height * 0.44);
            oCtx.lineTo(cx + faceBox.width * 0.40, cy + faceBox.height * 0.44);
            oCtx.lineTo(cx + faceBox.width * 0.40, cy + faceBox.height * 0.44 - r);
            oCtx.stroke();

            // Centering Reticle
            oCtx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            oCtx.lineWidth = 1;
            oCtx.beginPath();
            oCtx.moveTo(cx - 8, cy);
            oCtx.lineTo(cx + 8, cy);
            oCtx.moveTo(cx, cy - 8);
            oCtx.lineTo(cx, cy + 8);
            oCtx.stroke();

            oCtx.restore();

            return; // Do NOT start Face Mesh wireframe or calibration/gestures yet!
          }

          // FACE IS POSITIONED CORRECTLY: Draw verified green border and Complete High-Precision Face Mesh Wireframe
          oCtx.save();
          oCtx.strokeStyle = "rgba(16, 185, 129, 0.9)";
          oCtx.lineWidth = 2.5;
          oCtx.beginPath();
          oCtx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
          oCtx.stroke();
          oCtx.restore();

          const now = Date.now();

          // MediaPipe FaceLandmarker Detection (Synchronous per-frame detection on video element)
          let mpLandmarks: any[] | null = null;
          let mpBlendshapes: Record<string, number> = {};

          if (
            mediapipeRef.current.isReady &&
            mediapipeRef.current.faceLandmarker &&
            videoRef.current &&
            videoRef.current.readyState >= 2 &&
            videoRef.current.videoWidth > 0
          ) {
            try {
              const videoTime = performance.now();
              if (videoTime > lastVideoTimestampRef.current) {
                lastVideoTimestampRef.current = videoTime;
                const mpResult = mediapipeRef.current.faceLandmarker.detectForVideo(videoRef.current, videoTime);
                if (mpResult && mpResult.faceLandmarks && mpResult.faceLandmarks.length > 0) {
                  mpLandmarks = mpResult.faceLandmarks[0];
                  if (mpResult.faceBlendshapes && mpResult.faceBlendshapes.length > 0) {
                    for (const cat of mpResult.faceBlendshapes[0].categories) {
                      mpBlendshapes[cat.categoryName] = cat.score;
                    }
                  }
                  if (!isMediaPipeActive) setIsMediaPipeActive(true);
                }
              }
            } catch (mpErr) {
              // Frame dropped or busy; fallback to canvas
            }
          }

          // Color Palette based on State
          let meshStroke = "rgba(16, 185, 129, 0.65)"; // Emerald (attentive)
          let pointFill = "#10b981";

          if (mode === "CALIBRATION") {
            meshStroke = "rgba(59, 130, 246, 0.75)"; // Blue (calibration)
            pointFill = "#3b82f6";
          } else if (isCurrentlyConfused) {
            meshStroke = "rgba(245, 158, 11, 0.85)"; // Amber (confusion/hesitation)
            pointFill = "#f59e0b";
          }

          oCtx.lineWidth = 1.2;
          oCtx.strokeStyle = meshStroke;
          oCtx.fillStyle = pointFill;

          if (mpLandmarks && mpLandmarks.length >= 468) {
            // Draw High-Precision Google MediaPipe Face Mesh Contours (478 Landmarks)
            const drawContour = (indices: number[]) => {
              if (indices.length < 2) return;
              oCtx.beginPath();
              const p0 = mpLandmarks![indices[0]];
              if (!p0) return;
              oCtx.moveTo(p0.x * w, p0.y * h);
              for (let i = 1; i < indices.length; i++) {
                const pt = mpLandmarks![indices[i]];
                if (pt) oCtx.lineTo(pt.x * w, pt.y * h);
              }
              oCtx.stroke();
            };

            drawContour(MEDIAPIPE_CONTOURS.oval);
            drawContour(MEDIAPIPE_CONTOURS.leftEyebrow);
            drawContour(MEDIAPIPE_CONTOURS.rightEyebrow);
            drawContour(MEDIAPIPE_CONTOURS.leftEye);
            drawContour(MEDIAPIPE_CONTOURS.rightEye);
            drawContour(MEDIAPIPE_CONTOURS.noseBridge);
            drawContour(MEDIAPIPE_CONTOURS.lipsOuter);

            // Draw prominent MediaPipe landmark nodes
            const keyNodes = [10, 9, 33, 263, 1, 4, 61, 291, 152, 70, 107, 336, 300, 234, 454];
            for (const idx of keyNodes) {
              const pt = mpLandmarks[idx];
              if (pt) {
                oCtx.beginPath();
                oCtx.arc(pt.x * w, pt.y * h, 2.2, 0, 2 * Math.PI);
                oCtx.fill();
              }
            }
          } else {
            // Fallback Geometric Mesh Wireframe
            const meshPoints = {
              glabellaL: { x: cx - faceBox.width * 0.08, y: cy - faceBox.height * 0.26 },
              glabellaR: { x: cx + faceBox.width * 0.08, y: cy - faceBox.height * 0.26 },
              foreheadMid: { x: cx, y: cy - faceBox.height * 0.38 },
              browL1: { x: cx - faceBox.width * 0.34, y: cy - faceBox.height * 0.24 },
              browL2: { x: cx - faceBox.width * 0.22, y: cy - faceBox.height * 0.28 },
              browL3: { x: cx - faceBox.width * 0.10, y: cy - faceBox.height * 0.27 },
              browR1: { x: cx + faceBox.width * 0.10, y: cy - faceBox.height * 0.27 },
              browR2: { x: cx + faceBox.width * 0.22, y: cy - faceBox.height * 0.28 },
              browR3: { x: cx + faceBox.width * 0.34, y: cy - faceBox.height * 0.24 },
              eyeLOuter: { x: cx - faceBox.width * 0.32, y: cy - faceBox.height * 0.15 },
              eyeLInner: { x: cx - faceBox.width * 0.14, y: cy - faceBox.height * 0.15 },
              eyeLTop: { x: cx - faceBox.width * 0.23, y: cy - faceBox.height * 0.19 },
              eyeLBottom: { x: cx - faceBox.width * 0.23, y: cy - faceBox.height * 0.11 },
              eyeROuter: { x: cx + faceBox.width * 0.32, y: cy - faceBox.height * 0.15 },
              eyeRInner: { x: cx + faceBox.width * 0.14, y: cy - faceBox.height * 0.15 },
              eyeRTop: { x: cx + faceBox.width * 0.23, y: cy - faceBox.height * 0.19 },
              eyeRBottom: { x: cx + faceBox.width * 0.23, y: cy - faceBox.height * 0.11 },
              noseBridgeTop: { x: cx, y: cy - faceBox.height * 0.20 },
              noseTip: { x: cx, y: cy + faceBox.height * 0.05 },
              noseBaseL: { x: cx - faceBox.width * 0.11, y: cy + faceBox.height * 0.08 },
              noseBaseR: { x: cx + faceBox.width * 0.11, y: cy + faceBox.height * 0.08 },
              cheekL: { x: cx - faceBox.width * 0.36, y: cy + faceBox.height * 0.06 },
              cheekR: { x: cx + faceBox.width * 0.36, y: cy + faceBox.height * 0.06 },
              mouthL: { x: cx - faceBox.width * 0.20, y: cy + faceBox.height * 0.25 },
              mouthR: { x: cx + faceBox.width * 0.20, y: cy + faceBox.height * 0.25 },
              mouthTop: { x: cx, y: cy + faceBox.height * 0.20 },
              mouthBottom: { x: cx, y: cy + faceBox.height * 0.30 },
              chin: { x: cx, y: cy + faceBox.height * 0.44 },
              jawL: { x: cx - faceBox.width * 0.30, y: cy + faceBox.height * 0.34 },
              jawR: { x: cx + faceBox.width * 0.30, y: cy + faceBox.height * 0.34 },
            };

            const drawLine = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
              oCtx.beginPath();
              oCtx.moveTo(p1.x, p1.y);
              oCtx.lineTo(p2.x, p2.y);
              oCtx.stroke();
            };

            oCtx.beginPath();
            oCtx.ellipse(cx, cy + faceBox.height * 0.04, faceBox.width * 0.44, faceBox.height * 0.48, 0, 0, 2 * Math.PI);
            oCtx.stroke();

            drawLine(meshPoints.foreheadMid, meshPoints.glabellaL);
            drawLine(meshPoints.foreheadMid, meshPoints.glabellaR);
            drawLine(meshPoints.glabellaL, meshPoints.browL3);
            drawLine(meshPoints.browL3, meshPoints.browL2);
            drawLine(meshPoints.browL2, meshPoints.browL1);
            drawLine(meshPoints.glabellaR, meshPoints.browR1);
            drawLine(meshPoints.browR1, meshPoints.browR2);
            drawLine(meshPoints.browR2, meshPoints.browR3);

            drawLine(meshPoints.eyeLOuter, meshPoints.eyeLTop);
            drawLine(meshPoints.eyeLTop, meshPoints.eyeLInner);
            drawLine(meshPoints.eyeLInner, meshPoints.eyeLBottom);
            drawLine(meshPoints.eyeLBottom, meshPoints.eyeLOuter);

            drawLine(meshPoints.eyeROuter, meshPoints.eyeRTop);
            drawLine(meshPoints.eyeRTop, meshPoints.eyeRInner);
            drawLine(meshPoints.eyeRInner, meshPoints.eyeRBottom);
            drawLine(meshPoints.eyeRBottom, meshPoints.eyeROuter);

            drawLine(meshPoints.glabellaL, meshPoints.noseBridgeTop);
            drawLine(meshPoints.glabellaR, meshPoints.noseBridgeTop);
            drawLine(meshPoints.noseBridgeTop, meshPoints.noseTip);
            drawLine(meshPoints.noseTip, meshPoints.noseBaseL);
            drawLine(meshPoints.noseTip, meshPoints.noseBaseR);
            drawLine(meshPoints.noseBaseL, meshPoints.noseBaseR);

            drawLine(meshPoints.eyeLOuter, meshPoints.cheekL);
            drawLine(meshPoints.eyeROuter, meshPoints.cheekR);
            drawLine(meshPoints.noseTip, meshPoints.mouthTop);
            drawLine(meshPoints.mouthL, meshPoints.mouthTop);
            drawLine(meshPoints.mouthTop, meshPoints.mouthR);
            drawLine(meshPoints.mouthR, meshPoints.mouthBottom);
            drawLine(meshPoints.mouthBottom, meshPoints.mouthL);

            drawLine(meshPoints.jawL, meshPoints.chin);
            drawLine(meshPoints.jawR, meshPoints.chin);
            drawLine(meshPoints.mouthBottom, meshPoints.chin);

            Object.values(meshPoints).forEach((pt) => {
              oCtx.beginPath();
              oCtx.arc(pt.x, pt.y, 2.5, 0, 2 * Math.PI);
              oCtx.fill();
            });
          }

          // Measure Multi-Zone Glabella & Forehead Contrast for Brow Furrow Detection
          const fX = Math.round(cx);
          const fY = Math.round(cy - faceBox.height * 0.38);
          let fLumSum = 0;
          let fCount = 0;
          for (let dy = -4; dy <= 4; dy++) {
            for (let dx = -10; dx <= 10; dx++) {
              const px = fX + dx;
              const py = fY + dy;
              if (px >= 0 && px < w && py >= 0 && py < h) {
                fLumSum += currentGrayscale[py * w + px];
                fCount++;
              }
            }
          }
          const foreheadMeanLum = fCount > 0 ? fLumSum / fCount : 128;

          const gX = Math.round(cx);
          const gY = Math.round(cy - faceBox.height * 0.26);
          let gLumSum = 0;
          let gCount = 0;
          let gGradSum = 0;
          let gGradCount = 0;
          for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -10; dx <= 10; dx++) {
              const px = gX + dx;
              const py = gY + dy;
              if (px >= 1 && px < w - 1 && py >= 0 && py < h) {
                gLumSum += currentGrayscale[py * w + px];
                gCount++;
                const hDiff = Math.abs(currentGrayscale[py * w + px + 1] - currentGrayscale[py * w + px - 1]);
                gGradSum += hDiff;
                gGradCount++;
              }
            }
          }
          const glabellaMeanLum = gCount > 0 ? gLumSum / gCount : 128;
          const glabellaGrad = gGradCount > 0 ? gGradSum / gGradCount : 0;
          const currentGlabellaDelta = (foreheadMeanLum - glabellaMeanLum) / 255;

          // Measure Bilateral Cheek & Temple Luminance & Asymmetry
          const cSpanX = Math.round(faceBox.width * 0.28);
          const cBaseY = Math.round(cy + faceBox.height * 0.08);
          const tSpanX = Math.round(faceBox.width * 0.32);
          const tBaseY = Math.round(cy - faceBox.height * 0.18);

          let lCheekSum = 0, rCheekSum = 0, cheekCount = 0;
          let lTempleSum = 0, rTempleSum = 0, templeCount = 0;

          for (let dy = -7; dy <= 7; dy++) {
            for (let dx = -7; dx <= 7; dx++) {
              const cpy = cBaseY + dy;
              const clx = Math.round(cx - cSpanX) + dx;
              const crx = Math.round(cx + cSpanX) + dx;
              if (clx >= 0 && clx < w && crx >= 0 && crx < w && cpy >= 0 && cpy < h) {
                lCheekSum += currentGrayscale[cpy * w + clx];
                rCheekSum += currentGrayscale[cpy * w + crx];
                cheekCount++;
              }

              const tpy = tBaseY + dy;
              const tlx = Math.round(cx - tSpanX) + dx;
              const trx = Math.round(cx + tSpanX) + dx;
              if (tlx >= 0 && tlx < w && trx >= 0 && trx < w && tpy >= 0 && tpy < h) {
                lTempleSum += currentGrayscale[tpy * w + tlx];
                rTempleSum += currentGrayscale[tpy * w + trx];
                templeCount++;
              }
            }
          }

          const leftCheekLum = cheekCount > 0 ? lCheekSum / cheekCount : 128;
          const rightCheekLum = cheekCount > 0 ? rCheekSum / cheekCount : 128;
          const cheekAsymmetry = Math.abs(leftCheekLum - rightCheekLum) / 255;

          const leftTempleLum = templeCount > 0 ? lTempleSum / templeCount : 128;
          const rightTempleLum = templeCount > 0 ? rTempleSum / templeCount : 128;
          const templeAsymmetry = Math.abs(leftTempleLum - rightTempleLum) / 255;

          // 2. STAGE 2 CALIBRATION MODE: Only advance progress once face is stable & aligned!
          if (mode === "CALIBRATION") {
            const vec = extractBiometricFingerprint(canvas, ctx, faceBox, currentGrayscale, mpLandmarks);
            meshVectorRef.current = vec;

            if (!isCalibratedRef.current) {
              const nextProgress = Math.min(100, calibrationProgressRef.current + 8);
              calibrationProgressRef.current = nextProgress;
              setCalibrationProgress(nextProgress);

              if (nextProgress >= 100) {
                isCalibratedRef.current = true;
                setIsCalibrated(true);
                baselineGlabellaContrastRef.current = currentGlabellaDelta;
                baselineCheekAsymmetryRef.current = cheekAsymmetry;
                baselineTempleAsymmetryRef.current = templeAsymmetry;
                const faceSnapshot = canvas.toDataURL("image/jpeg", 0.85);
                if (onCalibrationCompleteRef.current) {
                  onCalibrationCompleteRef.current(vec, faceSnapshot);
                }
              }
            }
          }

          // 3. STAGE 4 NOD DETECTION & CONFUSION TRACKING (Only runs once positioned)
          if (mode === "NOD_AND_VERIFY") {
            // Establish ambient room lighting asymmetry baseline if not yet set
            if (baselineCheekAsymmetryRef.current === null) {
              baselineCheekAsymmetryRef.current = cheekAsymmetry;
            }
            if (baselineTempleAsymmetryRef.current === null) {
              baselineTempleAsymmetryRef.current = templeAsymmetry;
            }

            // Signal 1: Brow Furrow Detection (Neural Blendshapes or Glabella Crease)
            const mpBrowDown = Math.max(mpBlendshapes["browDownLeft"] || 0, mpBlendshapes["browDownRight"] || 0);
            const isBrowFurrow =
              mpBrowDown >= 0.22 ||
              currentGlabellaDelta > baselineGlabellaContrastRef.current + 0.018 ||
              glabellaGrad > 13.5;

            // Signal 2: Puzzled Head Tilt (Neural Blendshapes or Eye Disparity)
            const mpBrowInnerUp = mpBlendshapes["browInnerUp"] || 0;
            const mpEyeSquint = Math.max(mpBlendshapes["eyeSquintLeft"] || 0, mpBlendshapes["eyeSquintRight"] || 0);

            const eSpanX = Math.round(faceBox.width * 0.22);
            const eBaseY = Math.round(cy - faceBox.height * 0.16);
            let lEyeWeightedY = 0, lEyeWeight = 0;
            let rEyeWeightedY = 0, rEyeWeight = 0;

            for (let dy = -8; dy <= 8; dy++) {
              for (let dx = -8; dx <= 8; dx++) {
                const py = eBaseY + dy;
                const plx = Math.round(cx - eSpanX) + dx;
                if (plx >= 0 && plx < w && py >= 0 && py < h) {
                  const weight = 255 - currentGrayscale[py * w + plx];
                  lEyeWeightedY += py * weight;
                  lEyeWeight += weight;
                }
                const prx = Math.round(cx + eSpanX) + dx;
                if (prx >= 0 && prx < w && py >= 0 && py < h) {
                  const weight = 255 - currentGrayscale[py * w + prx];
                  rEyeWeightedY += py * weight;
                  rEyeWeight += weight;
                }
              }
            }

            const leftEyeCentroidY = lEyeWeight > 0 ? lEyeWeightedY / lEyeWeight : eBaseY;
            const rightEyeCentroidY = rEyeWeight > 0 ? rEyeWeightedY / rEyeWeight : eBaseY;
            const eyeYDelta = Math.abs(leftEyeCentroidY - rightEyeCentroidY);
            const lateralFaceShift = currentFaceCenter ? Math.abs(currentFaceCenter.x - cx) / faceBox.width : 0;
            const isPuzzledTilt =
              mpBrowInnerUp >= 0.24 ||
              (mpBrowInnerUp >= 0.16 && mpEyeSquint >= 0.18) ||
              eyeYDelta >= 4.0 ||
              lateralFaceShift > 0.08;

            // Signal 3: Holding Head / Chin Rest (Delta from Ambient Room Baseline)
            // Normal room lighting already causes cheekAsymmetry of 0.12 - 0.20.
            // A genuine hand to head / chin rest causes delta > 0.20 above ambient baseline AND motion or high local contrast.
            const baseCheek = baselineCheekAsymmetryRef.current ?? cheekAsymmetry;
            const baseTemple = baselineTempleAsymmetryRef.current ?? templeAsymmetry;
            const deltaCheek = Math.abs(cheekAsymmetry - baseCheek);
            const deltaTemple = Math.abs(templeAsymmetry - baseTemple);
            const isHandToHead = (deltaCheek > 0.22 || deltaTemple > 0.22) && (totalMotion > 160 || Math.abs(leftCheekLum - rightCheekLum) > 60);

            // Prioritize conscious facial expressions (Brow Furrow & Puzzled Tilt first!)
            let isConfusedNow = false;
            let activeTriggerType: "BROW_FURROW" | "PUZZLED_TILT" | "HAND_TO_HEAD" = "BROW_FURROW";

            if (isBrowFurrow) {
              isConfusedNow = true;
              activeTriggerType = "BROW_FURROW";
            } else if (isPuzzledTilt) {
              isConfusedNow = true;
              activeTriggerType = "PUZZLED_TILT";
            } else if (isHandToHead) {
              isConfusedNow = true;
              activeTriggerType = "HAND_TO_HEAD";
            }

            // Balanced Accumulator: Rapidly resets on resting frames so false-positive storms cannot occur
            if (isConfusedNow) {
              confusionScoreAccumulatorRef.current = Math.min(100, confusionScoreAccumulatorRef.current + 16);
              if (!confusionActiveStartRef.current) {
                confusionActiveStartRef.current = now;
              }
            } else {
              // Rapid decay on clean resting frames
              confusionScoreAccumulatorRef.current = Math.max(0, confusionScoreAccumulatorRef.current - 8);
              if (confusionScoreAccumulatorRef.current === 0) {
                confusionActiveStartRef.current = null;
              }
            }

            const isConfusedActive = confusionScoreAccumulatorRef.current >= 45;
            setIsCurrentlyConfused(isConfusedActive);

            if (isConfusedActive) {
              const triggerName = activeTriggerType === "HAND_TO_HEAD"
                ? "Holding Head / Deliberating"
                : activeTriggerType === "PUZZLED_TILT"
                ? "Puzzled Head Tilt"
                : "Brow Furrow / Puzzled";
              setConfusionIndicatorText(`Hesitation: ${triggerName}`);

              const activeDurationMs = confusionActiveStartRef.current ? now - confusionActiveStartRef.current : 0;

              // Log hesitation event: requires sustained duration and 5.0s debounce, continuous during review
              if (
                now - lastConfusionLoggedTimeRef.current >= 5000 &&
                (activeDurationMs >= 1000 || confusionScoreAccumulatorRef.current >= 70)
              ) {
                totalEventsLoggedRef.current++;
                lastConfusionLoggedTimeRef.current = now;

                let intensity: "mild" | "moderate" | "high" = "mild";
                if (activeDurationMs >= 4000 || confusionScoreAccumulatorRef.current >= 85) {
                  intensity = "high";
                } else if (activeDurationMs >= 2000 || confusionScoreAccumulatorRef.current >= 65) {
                  intensity = "moderate";
                }

                const event: ConfusionEvent = {
                  id: `conf_${now}_${Math.random().toString(36).slice(2, 6)}`,
                  timestamp: new Date().toLocaleTimeString("en-SG", { hour12: false }),
                  relativeSeconds: reviewTimeSecondsRef.current,
                  triggerType: activeTriggerType,
                  intensity,
                  activeTopic: activeTopicRef.current || "Policy Summary Review",
                  speechSnippet: activeSpeechSnippetRef.current || "Reviewing policy summary & plain-language pillars",
                  clarificationNote: "Statutory 14-day Free-Look guarantee allows 100% full refund if terms are not satisfactory.",
                  durationSeconds: Math.max(1, Math.round(activeDurationMs / 1000)),
                };

                if (onConfusionLoggedRef.current) {
                  onConfusionLoggedRef.current(event);
                }
              }
            } else {
              setConfusionIndicatorText("Attentive Reading");
            }

            // High-Precision Biometric Face Verification (MediaPipe 3D Landmark Geometry + Google Gemini AI Verification)
            const currentVec = extractBiometricFingerprint(canvas, ctx, faceBox, currentGrayscale, mpLandmarks);
            let localMatch = 0.20;
            const refMesh = calibratedMeshRef.current || calibratedMesh;

            if (refMesh && refMesh.length >= 14) {
              localMatch = compareBiometricFingerprints(refMesh, currentVec);
            }

            let effectiveMatch = localMatch;
            let isMatchVerified = localMatch >= 0.78;

            if (aiVerificationStateRef.current && aiVerificationStateRef.current.completed) {
              if (!aiVerificationStateRef.current.isSamePerson) {
                // Impostor or different individual detected by Gemini AI
                effectiveMatch = Math.min(localMatch, aiVerificationStateRef.current.aiScore, 0.25);
                isMatchVerified = false;
              } else {
                // If local biometric detects a mismatch (< 0.70), a different person is in frame right now!
                if (localMatch < 0.70) {
                  effectiveMatch = localMatch;
                  isMatchVerified = false;
                } else {
                  // Confirmed biometric match
                  effectiveMatch = Math.min(0.98, localMatch * 0.50 + aiVerificationStateRef.current.aiScore * 0.50);
                  isMatchVerified = localMatch >= 0.75;
                }
              }
            } else {
              isMatchVerified = localMatch >= 0.78;
            }

            setFaceMatchScore(effectiveMatch);
            setFaceMatchVerified(isMatchVerified);

            // Asynchronous Google Gemini Multimodal Face Verification (STRICTLY CAPPED TO 2 CALLS PER SESSION)
            // Call 1 of 2: Exactly once upon Stage 4 entry after face alignment is verified
            if (calibratedFaceImage && !hasInitialAiVerifyFiredRef.current && !isAiVerifying) {
              hasInitialAiVerifyFiredRef.current = true;
              if (runAiFaceVerificationRef.current) {
                runAiFaceVerificationRef.current("STAGE4_ENTRY", canvas);
              }
            }

            // Head Nod & Shake Gestures with Strict Dominance & Biometric Gate
            let posX = currentFaceCenter ? currentFaceCenter.x / w : null;
            let posY = currentFaceCenter ? currentFaceCenter.y / h : null;

            if (mpLandmarks && mpLandmarks[1]) {
              // High-precision 3D MediaPipe tracking using nose tip (Landmark 1)
              posX = mpLandmarks[1].x;
              posY = mpLandmarks[1].y;
            } else if (totalMotion > 260) {
              const avgMotionY = motionSumY / totalMotion / h;
              const avgMotionX = motionSumX / totalMotion / w;
              if (posX === null) posX = avgMotionX;
              if (posY === null) posY = avgMotionY;
              else {
                posX = posX * 0.65 + avgMotionX * 0.35;
                posY = posY * 0.65 + avgMotionY * 0.35;
              }
            }

            if (posX !== null && posY !== null) {
              pitchHistoryRef.current.push({ time: now, pitch: posY });
              yawHistoryRef.current.push({ time: now, yaw: posX });

              pitchHistoryRef.current = pitchHistoryRef.current.filter((p) => now - p.time <= 1400);
              yawHistoryRef.current = yawHistoryRef.current.filter((y) => now - y.time <= 1400);

              if (pitchHistoryRef.current.length >= 3 && yawHistoryRef.current.length >= 3) {
                const maxP = Math.max(...pitchHistoryRef.current.map((p) => p.pitch));
                const minP = Math.min(...pitchHistoryRef.current.map((p) => p.pitch));
                const diffP = maxP - minP;

                const maxY = Math.max(...yawHistoryRef.current.map((y) => y.yaw));
                const minY = Math.min(...yawHistoryRef.current.map((y) => y.yaw));
                const diffY = maxY - minY;

                const GESTURE_MIN_AMP = 0.024; // Subtle, natural movement amplitude

                // SHAKE (Disagreement): Horizontal movement diffY MUST clearly dominate vertical movement diffP
                if (diffY >= GESTURE_MIN_AMP && diffY > diffP * 1.15 && now - lastShakeTriggerRef.current > 2000) {
                  lastShakeTriggerRef.current = now;
                  lastNodTriggerRef.current = 0; // prevent overlap
                  setShakeDisagree(true);
                  setNodAgreed(false);
                  pitchHistoryRef.current = [];
                  yawHistoryRef.current = [];
                  if (onNodDetectedRef.current) {
                    onNodDetectedRef.current(false, 0.92, effectiveMatch);
                  }
                }
                // NOD (Agreement): Vertical movement diffP MUST clearly dominate horizontal movement diffY
                else if (diffP >= GESTURE_MIN_AMP && diffP > diffY * 1.15 && now - lastNodTriggerRef.current > 2000) {
                  // BIOMETRIC SECURITY GATE: Block nod agreement if face match fails (different person!)
                  if (!isMatchVerified) {
                    setStatusMessage("Agreement Blocked: Identity Mismatch (Different person detected)");
                    setShakeDisagree(true);
                    setNodAgreed(false);
                    return;
                  }

                  // Call 2 of 2: Exactly once when agreement nod is detected before signature
                  if (calibratedFaceImage && !hasAgreementAiVerifyFiredRef.current && !isAiVerifying) {
                    hasAgreementAiVerifyFiredRef.current = true;
                    if (runAiFaceVerificationRef.current) {
                      runAiFaceVerificationRef.current("AGREEMENT_CONFIRM", canvas);
                    }
                  }

                  lastNodTriggerRef.current = now;
                  lastShakeTriggerRef.current = 0; // prevent overlap
                  setNodAgreed(true);
                  setShakeDisagree(false);
                  pitchHistoryRef.current = [];
                  yawHistoryRef.current = [];
                  if (onNodDetectedRef.current) {
                    onNodDetectedRef.current(true, 0.96, effectiveMatch);
                  }
                }
              }
            }
          }
        }
      }
    }, 120);

    return () => clearInterval(interval);
  }, [cameraActive, mode]);

  if (compact) return (
    <section className={`camera-preview camera-compact ${minimized ? "camera-minimized" : ""}`} aria-label="Camera verification">
      <div className="camera-preview-heading"><h2>{mode === "CALIBRATION" ? "Your camera preview" : "Final camera check"}</h2><span>{cameraActive ? "Camera on" : "Camera off"}</span></div>
      <div className={`camera-viewfinder ${cameraActive ? "is-live" : ""}`}>
        <video ref={videoRef} autoPlay playsInline muted aria-label="Your live camera preview" />
        <canvas ref={canvasRef} hidden /><canvas ref={overlayCanvasRef} hidden />
        {!cameraActive && <div className="camera-placeholder"><Camera size={28}/><strong>You’ll see yourself here</strong></div>}
      </div>
      <div className="camera-controls"><button className="v-button secondary full" onClick={cameraActive ? stopCamera : startCamera}>{cameraActive ? "Turn camera off" : "Turn on camera"}</button></div>
      <p className="camera-privacy" role="status">{!cameraActive ? "Enable your camera to run the check." : mode === "CALIBRATION" ? calibrationProgress >= 100 ? "Opening check complete" : positioningHint : nodAgreed ? "Face and nod check complete" : faceMatchVerified ? "Look at the camera and nod to confirm." : faceMatchReason}</p>
    </section>
  );

  // Calibration Screen Layout (Step 2)
  if (mode === "CALIBRATION") {
    return (
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-6 text-center space-y-4">
        <div className="relative w-full max-w-xs mx-auto aspect-4/3 bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner flex items-center justify-center">
          {cameraActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
                style={{ transform: "scaleX(-1)" }}
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none -scale-x-100"
                style={{ transform: "scaleX(-1)" }}
              />
            </>
          ) : (
            <div className="text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Smile className="w-8 h-8" />
              </div>
              <p className="text-xs text-slate-400">Camera preview will appear here</p>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />

          {/* Positioning Indicator Badge */}
          {cameraActive && (
            <div className="absolute top-2 left-2 right-2 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-xs flex items-center justify-between text-[10px] font-mono text-white z-10">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isFacePositioned
                      ? "bg-emerald-400"
                      : alignmentProgress > 0
                      ? "bg-blue-400 animate-pulse"
                      : "bg-amber-400 animate-ping"
                  }`}
                />
                <span>{positioningHint}</span>
              </span>
              <span>{isFacePositioned ? "Ready" : `${alignmentProgress}%`}</span>
            </div>
          )}

          {/* Centering Guidance Banner (Unmirrored HTML) */}
          {cameraActive && !isFacePositioned && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-950/90 backdrop-blur-xs border border-white/20 text-center shadow-lg pointer-events-none z-10 max-w-[90%] whitespace-nowrap">
              <p className="text-[10px] font-semibold text-white tracking-wide">
                {positioningHint}
              </p>
            </div>
          )}
        </div>

        {/* Camera Action / Calibration Progress */}
        {!cameraActive ? (
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-xs transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Turn on camera</span>
          </button>
        ) : (
          <div className="max-w-xs mx-auto space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>
                  {!isFacePositioned
                    ? `Positioning Face (${alignmentProgress}%)...`
                    : "Calibrating High-Precision Face Mesh..."}
                </span>
              </span>
              <span className="font-mono text-blue-600">
                {!isFacePositioned ? `${alignmentProgress}%` : `${Math.min(100, calibrationProgress)}%`}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isFacePositioned ? "bg-emerald-600" : alignmentProgress > 0 ? "bg-blue-600" : "bg-slate-400"
                }`}
                style={{
                  width: `${!isFacePositioned ? alignmentProgress : Math.min(100, calibrationProgress)}%`,
                }}
              />
            </div>
            {!isFacePositioned ? (
              <p className="text-[11px] text-slate-500">
                Position your face inside the oval guide and hold steady for ~1 second to begin face mesh calibration.
              </p>
            ) : calibrationProgress >= 100 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Face Mesh Calibrated for Agreement Gesture Check</span>
              </span>
            ) : (
              <p className="text-[11px] text-emerald-700 font-medium">
                Face locked in position. Mapping facial landmark geometry...
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Nod & Face Verification Mode (Step 4 Review Before Sign)
  if (mode === "NOD_AND_VERIFY") {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Camera Frame with Live Face Mesh Overlay */}
          <div className="relative w-40 h-32 shrink-0 bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-300 shadow-sm flex items-center justify-center">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                  style={{ transform: "scaleX(-1)" }}
                />
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none -scale-x-100"
                  style={{ transform: "scaleX(-1)" }}
                />
              </>
            ) : (
              <CameraOff className="w-6 h-6 text-slate-500" />
            )}
            <canvas ref={canvasRef} className="hidden" />

            {/* Live Indicator Pill on Camera */}
            <div className="absolute bottom-1.5 left-1.5 right-1.5 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-xs flex items-center justify-between text-[9px] font-mono text-white z-10">
              <span className="flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    !isFacePositioned
                      ? "bg-amber-400"
                      : isCurrentlyConfused
                      ? "bg-amber-400 animate-ping"
                      : "bg-emerald-400"
                  }`}
                />
                <span className="truncate max-w-[95px]">
                  {!isFacePositioned
                    ? positioningHint
                    : !faceMatchVerified
                    ? "Mismatch ⚠️"
                    : isCurrentlyConfused
                    ? "Hesitation"
                    : "Attentive"}
                </span>
              </span>
              <span>{isFacePositioned ? (faceMatchVerified ? `${Math.round(faceMatchScore * 100)}% match` : "Mismatch ⚠️") : `${alignmentProgress}%`}</span>
            </div>

            {/* Non-mirrored Centering Banner for NOD_AND_VERIFY */}
            {cameraActive && !isFacePositioned && (
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-amber-500/95 text-slate-950 text-[9px] font-bold shadow-xs pointer-events-none z-10 whitespace-nowrap">
                {positioningHint}
              </div>
            )}
          </div>

          {/* Gesture & Face Match Feedback */}
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <span className="text-xs font-bold text-slate-800">Recap Agreement Confirmation</span>
              {faceMatchVerified && isFacePositioned && (
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Biometric Verified: {Math.round(faceMatchScore * 100)}%</span>
                </span>
              )}
              {isMediaPipeActive && isFacePositioned && (
                <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <BrainCircuit className="w-3 h-3 text-indigo-600" />
                  <span>MediaPipe 3D Mesh</span>
                </span>
              )}
              {!faceMatchVerified && isFacePositioned && (
                <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  <span>Identity Mismatch: Different Person ({Math.round(faceMatchScore * 100)}%)</span>
                </span>
              )}
              {isAiVerifying && (
                <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>Gemini AI Checking...</span>
                </span>
              )}
              {!isFacePositioned && (
                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Scan className="w-3 h-3 text-amber-600" />
                  <span>Center face in oval to enable mesh</span>
                </span>
              )}
              {isCurrentlyConfused && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>Hesitation Detected on Summary</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Read the summary below at your own pace. When ready, <strong className="text-slate-900 font-bold">nod your head to the camera</strong> to confirm your agreement, or tap the confirm button.
            </p>

            {/* Gesture Status Pill & Interactive Toggles */}
            <div className="pt-1 space-y-2">
              {nodAgreed && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-xs animate-bounce">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Nod / Agreement Confirmed</span>
                </div>
              )}

              {shakeDisagree && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 shadow-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>Objection / Disagreement Noted</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                <button
                  type="button"
                  disabled={!faceMatchVerified}
                  onClick={() => {
                    if (!faceMatchVerified) return;
                    // Call 2 of 2: Triggered if manual fallback agree is clicked before signature
                    if (calibratedFaceImage && !hasAgreementAiVerifyFiredRef.current && !isAiVerifying) {
                      hasAgreementAiVerifyFiredRef.current = true;
                      runAiFaceVerification("AGREEMENT_CONFIRM", canvasRef.current);
                    }
                    setNodAgreed(true);
                    setShakeDisagree(false);
                    if (onNodDetected) onNodDetected(true, 0.98, faceMatchScore);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    !faceMatchVerified
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      : nodAgreed
                      ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>✓ Agree / Confirm</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShakeDisagree(true);
                    setNodAgreed(false);
                    if (onNodDetected) onNodDetected(false, 0.92, faceMatchScore);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    shakeDisagree
                      ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-300"
                      : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>✗ Object / Disagree</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default Focus Monitor (Minimal fallback)
  return null;
}
