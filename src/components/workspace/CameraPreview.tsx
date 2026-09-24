"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Check, RefreshCw } from "lucide-react";

export function CameraPreview({
  stage,
  checked,
  onChecked,
  compact = false,
  minimized = false,
  hideDemoCheck = false,
}: {
  stage: "opening" | "review";
  checked: boolean;
  onChecked: () => void;
  compact?: boolean;
  minimized?: boolean;
  hideDemoCheck?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const request = useRef(0);
  const [state, setState] = useState<"off" | "requesting" | "on" | "error">(
    "off",
  );
  const [error, setError] = useState("");
  function release() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }
  useEffect(
    () => () => {
      request.current += 1;
      stream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );
  async function enable() {
    const token = ++request.current;
    release();
    setError("");
    setState("requesting");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera access requires HTTPS or localhost and a supported browser.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      if (request.current !== token) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play();
      }
      if (request.current !== token) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      setState("on");
    } catch (err) {
      if (request.current !== token) return;
      release();
      setState("error");
      const name = err instanceof Error ? err.name : "";
      setError(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser, then try again."
          : name === "NotFoundError"
            ? "No camera was found. Connect a camera or use the demo option below."
            : name === "NotReadableError"
              ? "Your camera may be in use by another app. Close that app and try again."
              : "We couldn’t open the camera. Check your browser permissions and try again.",
      );
    }
  }
  function stop() {
    request.current += 1;
    release();
    setState("off");
  }
  return (
    <section
      className={`camera-preview ${compact ? "camera-compact" : ""} ${minimized ? "camera-minimized" : ""}`}
      aria-labelledby={`camera-title-${stage}`}
    >
      <div className="camera-preview-heading">
        <h2 id={`camera-title-${stage}`}>
          {stage === "opening" ? "Your camera preview" : "Final camera check"}
        </h2>
        <span className={state === "on" ? "camera-live" : ""}>
          {state === "on"
            ? "Camera on"
            : state === "requesting"
              ? "Connecting…"
              : "Camera off"}
        </span>
      </div>
      <p>
        {stage === "opening"
          ? "Position your face in the frame. Your camera turns off when you join the conversation."
          : "Keep your face visible while reviewing the summary. In the live system, a face match and a nod confirm it’s you."}
      </p>
      <div className={`camera-viewfinder ${state === "on" ? "is-live" : ""}`}>
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          aria-label="Your live camera preview"
        />
        {state !== "on" && (
          <div className="camera-placeholder">
            <Camera size={32} strokeWidth={1.5} />
            <strong>
              {state === "requesting"
                ? "Allow camera access in your browser"
                : "You’ll see yourself here"}
            </strong>
            <span>
              {state === "requesting"
                ? "Your browser may be waiting for permission."
                : "The camera starts only when you choose."}
            </span>
          </div>
        )}
        <div className="camera-face-guide" aria-hidden="true" />
      </div>
      {error && (
        <p className="camera-error" role="alert">
          {error}
        </p>
      )}
      <div className="camera-controls">
        {state === "on" ? (
          <button className="v-button secondary full" onClick={stop}>
            <CameraOff size={17} />
            Turn camera off
          </button>
        ) : state === "requesting" ? (
          <button className="v-button secondary full" onClick={stop}>
            Cancel camera request
          </button>
        ) : (
          <button className="v-button primary full" onClick={enable}>
            {state === "error" ? <RefreshCw size={17} /> : <Camera size={17} />}
            {state === "error" ? "Try camera again" : "Turn on camera"}
          </button>
        )}
      </div>
      <p className="camera-privacy">
        Live preview only. Video stays in this browser and is not recorded or
        uploaded.
      </p>
      {!hideDemoCheck && (
        <div className="camera-demo-check">
          <span>PROTOTYPE CHECK</span>
          <p>Face matching and gesture recognition are not connected yet.</p>
          <button
            className="v-button secondary full"
            disabled={checked}
            onClick={onChecked}
          >
            {checked && <Check size={17} />}
            {checked
              ? "Demo check complete"
              : stage === "opening"
                ? "Simulate identity check"
                : "Simulate face match and nod"}
          </button>
          {state !== "on" && !checked && (
            <small>You can test the flow without a camera.</small>
          )}
        </div>
      )}
    </section>
  );
}
