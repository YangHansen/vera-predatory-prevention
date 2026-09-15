"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AlertCircle, Sparkles, Cpu, Globe, Radio } from "lucide-react";

export type SttEngineMode = "cloud" | "browser";

interface SpeechListenerProps {
  onTranscript: (text: string) => void;
  isListening: boolean;
  onToggleListening: (listening: boolean) => void;
  interimTranscript: string;
  setInterimTranscript: (text: string) => void;
  engineMode?: SttEngineMode;
  onEngineModeChange?: (mode: SttEngineMode) => void;
}

// Helper: Downsample Float32 audio buffer from input sample rate to 16000 Hz
function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate = 16000
): Float32Array {
  if (inputSampleRate === outputSampleRate) return buffer;
  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

// Helper: Encode Float32Array into a valid 16kHz 16-bit Mono PCM WAV base64 string
function encodeWavBase64(samples: Float32Array, sampleRate = 16000): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (16000 * 2)
  view.setUint16(32, 2, true); // BlockAlign (2 bytes)
  view.setUint16(34, 16, true); // BitsPerSample (16)
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function SpeechListener({
  onTranscript,
  isListening,
  onToggleListening,
  interimTranscript,
  setInterimTranscript,
  engineMode = "browser",
  onEngineModeChange,
}: SpeechListenerProps) {
  const [selectedEngine, setSelectedEngine] = useState<SttEngineMode>(engineMode);
  const [statusMessage, setStatusMessage] = useState<string>("Mic Idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [audioVolumeLevel, setAudioVolumeLevel] = useState<number>(0);

  // Stable references
  const onTranscriptRef = useRef(onTranscript);
  const onToggleListeningRef = useRef(onToggleListening);
  const setInterimTranscriptRef = useRef(setInterimTranscript);
  const isListeningRef = useRef(isListening);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const currentVolumeRef = useRef<number>(0);
  const flushAudioRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onToggleListeningRef.current = onToggleListening;
    setInterimTranscriptRef.current = setInterimTranscript;
  }, [onTranscript, onToggleListening, setInterimTranscript]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const handleEngineChange = (mode: SttEngineMode) => {
    setSelectedEngine(mode);
    if (onEngineModeChange) onEngineModeChange(mode);
    if (isListening) {
      onToggleListening(false);
      setTimeout(() => onToggleListening(true), 200);
    }
  };

  // Stop All Audio & cleanup resources
  const cleanupAll = useCallback(() => {
    if (flushAudioRef.current) {
      try {
        flushAudioRef.current();
      } catch {}
      flushAudioRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.onaudioprocess = null;
        scriptProcessorRef.current.disconnect();
      } catch {}
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      mediaStreamRef.current = null;
    }
    setAudioVolumeLevel(0);
    currentVolumeRef.current = 0;
  }, []);

  // Visualizer Setup
  const setupVisualizer = (audioCtx: AudioContext, source: MediaStreamAudioSourceNode) => {
    try {
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!isListeningRef.current || !analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioVolumeLevel(normalized);
        currentVolumeRef.current = normalized;

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (e) {
      console.warn("Visualizer error:", e);
    }
  };

  // 1. Browser Native Real-Time Web Speech API
  const startBrowserSpeech = useCallback((stream: MediaStream) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg("Browser Web Speech API not supported in this browser. Switching to Gemini Cloud...");
      setSelectedEngine("cloud");
      return false;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === "suspended") audioCtx.resume();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      setupVisualizer(audioCtx, source);

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang =
        typeof navigator !== "undefined" && navigator.language
          ? navigator.language
          : "en-US";

      recognition.onstart = () => {
        setErrorMsg(null);
        setStatusMessage("Browser Real-Time Listening (Active)");
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const text = item[0]?.transcript || "";
          if (item.isFinal) {
            finalChunk += text + " ";
          } else {
            interim += text;
          }
        }

        if (finalChunk.trim().length > 0) {
          onTranscriptRef.current(finalChunk.trim());
          setInterimTranscriptRef.current("");
        } else if (interim.trim().length > 0) {
          setInterimTranscriptRef.current(interim);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "no-speech") return;
        if (event.error === "not-allowed") {
          setErrorMsg("Microphone permission denied in browser settings.");
          onToggleListeningRef.current(false);
          return;
        }
        if (event.error === "network" || event.error === "service-not-allowed" || event.error === "audio-capture") {
          console.warn("Web Speech network/service issue, falling back to Gemini Cloud STT:", event.error);
          setSelectedEngine("cloud");
        }
      };

      recognition.onend = () => {
        // Immediate restart with zero dead-zone if still listening
        if (isListeningRef.current && recognitionRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      return true;
    } catch (e: any) {
      console.warn("Browser Speech error:", e);
      setErrorMsg("Web Speech failed: " + e.message);
      return false;
    }
  }, []);

  // 2. Google Gemini Cloud STT (Continuous AudioContext PCM WAV Slices to /api/copilot/transcribe)
  const startGoogleCloudSTT = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      setupVisualizer(audioCtx, source);

      // Create continuous ScriptProcessor for uninterrupted audio capture
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      // Keep processor active by connecting through zero-gain mute node to destination
      const muteGain = audioCtx.createGain();
      muteGain.gain.value = 0;
      source.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(audioCtx.destination);

      let accumulatedSamples: Float32Array[] = [];
      let accumulatedLength = 0;
      let lastSliceTime = Date.now();
      let isSending = false;

      const sendCurrentBuffer = async () => {
        if (accumulatedLength < audioCtx.sampleRate * 0.8 || isSending) return;

        isSending = true;
        const merged = new Float32Array(accumulatedLength);
        let offset = 0;
        for (const chunk of accumulatedSamples) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }

        // Reset buffer with zero gap
        accumulatedSamples = [];
        accumulatedLength = 0;
        lastSliceTime = Date.now();

        try {
          // Downsample to 16kHz mono WAV
          const downsampled = downsampleBuffer(merged, audioCtx.sampleRate, 16000);
          const base64Wav = encodeWavBase64(downsampled, 16000);

          setStatusMessage("Transcribing with Gemini Cloud...");
          const res = await fetch("/api/copilot/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioBase64: base64Wav,
              mimeType: "audio/wav",
            }),
          });

          const data = await res.json();
          if (data.success && data.transcript && data.transcript.trim().length > 0) {
            onTranscriptRef.current(data.transcript.trim());
          }
        } catch (err) {
          console.warn("Gemini transcription error:", err);
        } finally {
          isSending = false;
          if (isListeningRef.current) {
            setStatusMessage("Google Gemini Cloud STT (Active)");
          }
        }
      };

      // Set flush handler so final words are never dropped when user stops
      flushAudioRef.current = () => {
        if (accumulatedLength >= audioCtx.sampleRate * 0.6) {
          sendCurrentBuffer();
        }
      };

      processor.onaudioprocess = (e) => {
        if (!isListeningRef.current) return;
        const input = e.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input.length);
        copy.set(input);
        accumulatedSamples.push(copy);
        accumulatedLength += copy.length;

        const elapsedMs = Date.now() - lastSliceTime;
        const vol = currentVolumeRef.current;

        // VAD boundary slicing:
        // Slice at natural pause (vol < 12%) after 3.2s, or force slice at 4.5s max
        const shouldSlice = elapsedMs >= 4500 || (elapsedMs >= 3200 && vol < 12);

        if (shouldSlice && !isSending && accumulatedLength >= audioCtx.sampleRate * 1.0) {
          sendCurrentBuffer();
        }
      };

      setStatusMessage("Google Gemini Cloud STT (Active)");
      return true;
    } catch (e: any) {
      console.warn("Google Cloud STT setup error:", e);
      setErrorMsg("Failed to start cloud audio recorder: " + e.message);
      return false;
    }
  }, []);

  // Main Listening Effect
  useEffect(() => {
    if (isListening) {
      setErrorMsg(null);
      setStatusMessage("Requesting microphone...");

      // Disable echoCancellation and noiseSuppression so speaker playback is not muted by Chrome's AEC
      navigator.mediaDevices
        .getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true,
          },
        })
        .then((stream) => {
          mediaStreamRef.current = stream;

          if (selectedEngine === "cloud") {
            startGoogleCloudSTT(stream);
          } else {
            const started = startBrowserSpeech(stream);
            if (!started) {
              startGoogleCloudSTT(stream);
            }
          }
        })
        .catch((err) => {
          console.warn("Microphone access denied:", err);
          setErrorMsg("Microphone permission denied. Please allow microphone access in your browser.");
          onToggleListeningRef.current(false);
        });
    } else {
      cleanupAll();
      setStatusMessage("Mic Idle");
    }

    return () => {
      cleanupAll();
    };
  }, [isListening, selectedEngine, startBrowserSpeech, startGoogleCloudSTT, cleanupAll]);

  return (
    <div className="space-y-3">
      {/* Engine Switcher Bar */}
      <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <Cpu className="w-4 h-4 text-blue-600" />
          <span>STT Engine:</span>
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => handleEngineChange("cloud")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedEngine === "cloud"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>✨ Google Gemini Cloud AI</span>
          </button>

          <button
            type="button"
            onClick={() => handleEngineChange("browser")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedEngine === "browser"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>🌐 Browser Web Speech</span>
          </button>
        </div>
      </div>

      {/* Live Audio Visualizer Bar when listening */}
      {isListening && (
        <div className="p-3 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-200">
              {selectedEngine === "cloud" ? "Gemini Cloud Audio:" : "Browser Speech Mic:"}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-1 max-w-[160px]">
            {[10, 25, 40, 55, 70, 85].map((threshold, idx) => (
              <div
                key={idx}
                className={`h-3.5 flex-1 rounded-xs transition-all duration-75 ${
                  audioVolumeLevel >= threshold
                    ? threshold > 60
                      ? "bg-rose-500"
                      : threshold > 35
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                    : "bg-slate-800"
                }`}
              />
            ))}
          </div>

          <div className="text-[11px] font-mono flex items-center gap-1.5 text-blue-300">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Live Interim Speech Bubble (for Browser Speech) */}
      {isListening && interimTranscript && (
        <div className="p-3 bg-blue-950/70 rounded-2xl border border-blue-800 text-xs text-blue-200 flex items-start gap-2.5 animate-in fade-in">
          <Sparkles className="w-4 h-4 shrink-0 text-blue-400 animate-spin mt-0.5" />
          <div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-0.5">
              Transcribing Live:
            </span>
            <p className="italic font-mono text-white text-xs leading-relaxed">&quot;{interimTranscript}&quot;</p>
          </div>
        </div>
      )}

      {/* Error / Permissions Notice */}
      {errorMsg && (
        <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-2xl text-xs text-rose-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
