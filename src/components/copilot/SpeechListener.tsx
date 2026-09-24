"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AlertCircle, Sparkles, Cpu, Globe, Radio, Zap, Activity } from "lucide-react";
import type { SttEngineMode } from "@/types";

interface SpeechListenerProps {
  minimal?: boolean;
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

// Helper: Encode Float32Array into a raw 16kHz 16-bit Mono PCM base64 string for Gemini Live WebSocket
function encodePcmBase64(samples: Float32Array): string {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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
  minimal = false,
  onTranscript,
  isListening,
  onToggleListening,
  interimTranscript,
  setInterimTranscript,
  engineMode = "cloud",
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
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const currentVolumeRef = useRef<number>(0);
  const flushAudioRef = useRef<(() => void) | null>(null);

  // Web Speech continuous transcript persistence ref
  const pendingInterimRef = useRef<string>("");
  const liveStreamTextRef = useRef<string>("");
  const liveStreamFlushTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    if (liveStreamFlushTimerRef.current) {
      clearTimeout(liveStreamFlushTimerRef.current);
      liveStreamFlushTimerRef.current = null;
    }
    if (liveStreamTextRef.current.trim().length > 0) {
      onTranscriptRef.current(liveStreamTextRef.current.trim());
      liveStreamTextRef.current = "";
    }
    if (pendingInterimRef.current.trim().length > 0) {
      onTranscriptRef.current(pendingInterimRef.current.trim());
      pendingInterimRef.current = "";
    }
    setInterimTranscriptRef.current("");

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
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
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

  // 1. Google Gemini 3.5 Transcribe Live (Bidirectional WebSocket Streaming)
  const startGeminiLiveSTT = useCallback(async (stream: MediaStream) => {
    try {
      setStatusMessage("Connecting to Gemini Live...");
      const configRes = await fetch("/api/copilot/live-config");
      const configData = await configRes.json();

      if (!configData.success || !configData.wsUrl) {
        console.warn("Gemini Live configuration unavailable, falling back to Browser Web Speech");
        startBrowserSpeech(stream);
        return false;
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      setupVisualizer(audioCtx, source);

      const ws = new WebSocket(configData.wsUrl);
      wsRef.current = ws;

      let isWsReady = false;

      ws.onopen = () => {
        setStatusMessage("Connecting to Gemini Live...");
        setErrorMsg(null);

        // Send initial setup frame for verbatim STT transcription
        const setupMessage = {
          setup: {
            model: configData.model || "models/gemini-3.5-transcribe-live",
            generationConfig: {
              responseModalities: ["TEXT"],
              temperature: 0.0,
            },
            systemInstruction: {
              parts: [
                {
                  text: "You are a real-time verbatim speech-to-text transcriber for an insurance advisory consultation between a licensed Insurance Agent (Financial Adviser) and a prospective Client. Output strictly the exact English words spoken with proper punctuation, accurately capturing questions asked by the prospect versus explanations given by the adviser. Never respond to the user, never answer questions, never summarize, and never add introductory text. Transcribe spoken words verbatim.",
                },
              ],
            },
          },
        };
        ws.send(JSON.stringify(setupMessage));
      };

      ws.onmessage = async (event) => {
        try {
          let rawData = event.data;
          if (rawData instanceof Blob) {
            rawData = await rawData.text();
          }
          const data = JSON.parse(rawData);

          if (data?.setupComplete) {
            isWsReady = true;
            setStatusMessage("Gemini 3.5 Live (Streaming Active)");
            setErrorMsg(null);
            return;
          }

          if (data?.error) {
            console.warn("Gemini Live API error:", data.error);
            setErrorMsg(`Gemini Live: ${data.error.message || "Model error"}. Reverting to Browser STT...`);
            startBrowserSpeech(stream);
            return;
          }

          // Handle server text parts
          const parts = data?.serverContent?.modelTurn?.parts;
          if (Array.isArray(parts)) {
            for (const part of parts) {
              if (part.text) {
                liveStreamTextRef.current += part.text;
                setInterimTranscriptRef.current(liveStreamTextRef.current);

                // Auto-commit debounce timer (flush if no new words within 750ms)
                if (liveStreamFlushTimerRef.current) {
                  clearTimeout(liveStreamFlushTimerRef.current);
                }
                liveStreamFlushTimerRef.current = setTimeout(() => {
                  const finalChunk = liveStreamTextRef.current.trim();
                  if (finalChunk.length > 0) {
                    onTranscriptRef.current(finalChunk);
                    liveStreamTextRef.current = "";
                    setInterimTranscriptRef.current("");
                  }
                }, 750);
              }
            }
          }

          // When turn completes, commit transcript
          if (data?.serverContent?.turnComplete) {
            if (liveStreamFlushTimerRef.current) {
              clearTimeout(liveStreamFlushTimerRef.current);
              liveStreamFlushTimerRef.current = null;
            }
            const finalChunk = liveStreamTextRef.current.trim();
            if (finalChunk.length > 0) {
              onTranscriptRef.current(finalChunk);
              liveStreamTextRef.current = "";
              setInterimTranscriptRef.current("");
            }
          }
        } catch (e) {
          console.warn("Error parsing Gemini Live message:", e);
        }
      };

      ws.onerror = (err) => {
        console.warn("Gemini Live WebSocket error:", err);
        setErrorMsg("Gemini Live stream interrupted. Reverting to Browser STT...");
        startBrowserSpeech(stream);
      };

      ws.onclose = () => {
        isWsReady = false;
        if (isListeningRef.current) {
          setStatusMessage("Gemini Live Reconnecting...");
        }
      };

      // Create ScriptProcessor for 16kHz PCM audio streaming
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      const muteGain = audioCtx.createGain();
      muteGain.gain.value = 0;
      source.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(audioCtx.destination);

      let accumulatedSamples: Float32Array[] = [];
      let accumulatedLength = 0;
      let lastSendTime = Date.now();

      processor.onaudioprocess = (e) => {
        if (!isListeningRef.current || !isWsReady || ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input.length);
        copy.set(input);
        accumulatedSamples.push(copy);
        accumulatedLength += copy.length;

        const elapsedMs = Date.now() - lastSendTime;

        // Stream raw PCM chunks every ~250ms for low latency
        if (elapsedMs >= 250 && accumulatedLength > 0) {
          const merged = new Float32Array(accumulatedLength);
          let offset = 0;
          for (const chunk of accumulatedSamples) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }

          accumulatedSamples = [];
          accumulatedLength = 0;
          lastSendTime = Date.now();

          const downsampled = downsampleBuffer(merged, audioCtx.sampleRate, 16000);
          const pcmBase64 = encodePcmBase64(downsampled);

          const audioChunkMessage = {
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: "audio/pcm;rate=16000",
                  data: pcmBase64,
                },
              ],
            },
          };

          try {
            ws.send(JSON.stringify(audioChunkMessage));
          } catch (e) {
            console.warn("Failed to send PCM chunk:", e);
          }
        }
      };

      return true;
    } catch (e: any) {
      console.warn("Gemini Live init failed:", e);
      startBrowserSpeech(stream);
      return false;
    }
  }, []);

  // 2. Browser Native Real-Time Web Speech API (Continuous, zero word-loss on restarts)
  const startBrowserSpeech = useCallback((stream: MediaStream) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg("Browser Web Speech API not supported in this browser. Switching to Cloud REST...");
      startGoogleCloudSTT(stream);
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
          pendingInterimRef.current = "";
          onTranscriptRef.current(finalChunk.trim());
          setInterimTranscriptRef.current("");
        } else if (interim.trim().length > 0) {
          pendingInterimRef.current = interim.trim();
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
          console.warn("Web Speech network/service issue, falling back to Cloud REST STT:", event.error);
          startGoogleCloudSTT(stream);
        }
      };

      recognition.onend = () => {
        // Commit any pending interim text when recognition ends/restarts so middle speech is NEVER lost
        if (pendingInterimRef.current.trim().length > 0) {
          onTranscriptRef.current(pendingInterimRef.current.trim());
          pendingInterimRef.current = "";
          setInterimTranscriptRef.current("");
        }

        // Auto-restart immediately with zero gap
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

  // 3. Google Gemini Cloud STT (Continuous AudioContext PCM WAV Slices to /api/copilot/transcribe)
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

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      const muteGain = audioCtx.createGain();
      muteGain.gain.value = 0;
      source.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(audioCtx.destination);

      let accumulatedSamples: Float32Array[] = [];
      let accumulatedLength = 0;
      let lastSliceTime = Date.now();
      let lastSpeechTime = 0;
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

        accumulatedSamples = [];
        accumulatedLength = 0;
        lastSliceTime = Date.now();
        lastSpeechTime = 0;

        try {
          const downsampled = downsampleBuffer(merged, audioCtx.sampleRate, 16000);
          const base64Wav = encodeWavBase64(downsampled, 16000);

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
          } else if (!res.ok || !data.success) {
            console.warn("Gemini Cloud STT failed, initiating automatic Browser Web Speech fallback:", data?.error);
            setErrorMsg("Gemini STT unavailable. Switched to Browser Speech.");
            startBrowserSpeech(stream);
          }
        } catch (err) {
          console.warn("Cloud transcription error, falling back to Browser Web Speech:", err);
          setErrorMsg("Gemini STT connection error. Switched to Browser Speech.");
          startBrowserSpeech(stream);
        } finally {
          isSending = false;
          if (isListeningRef.current) {
            setStatusMessage("Cloud REST (Active - Pause-Aligned)");
          }
        }
      };

      flushAudioRef.current = () => {
        if (accumulatedLength >= audioCtx.sampleRate * 0.5) {
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

        // Calculate RMS volume for speech activity detection
        let sumSq = 0;
        for (let i = 0; i < input.length; i++) {
          sumSq += input[i] * input[i];
        }
        const rms = Math.sqrt(sumSq / input.length);
        const isSpeaking = rms > 0.012;
        const now = Date.now();

        if (isSpeaking) {
          lastSpeechTime = now;
        }

        const elapsedMs = now - lastSliceTime;
        const silenceDurationMs = lastSpeechTime > 0 ? now - lastSpeechTime : 0;

        // Dispatch on natural speech pause (>450ms silence after speech) OR max window (4.5s)
        const hasSpokenEnough = accumulatedLength >= audioCtx.sampleRate * 1.5;
        const isNaturalPause = hasSpokenEnough && silenceDurationMs >= 450;
        const isMaxWindowReached = elapsedMs >= 4500 && accumulatedLength >= audioCtx.sampleRate * 2.0;

        if ((isNaturalPause || isMaxWindowReached) && !isSending) {
          sendCurrentBuffer();
        }
      };

      setStatusMessage("Cloud REST (Active - Pause-Aligned)");
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

          if (selectedEngine === "gemini-live") {
            startGeminiLiveSTT(stream);
          } else if (selectedEngine === "cloud") {
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
  }, [isListening, selectedEngine, startGeminiLiveSTT, startBrowserSpeech, startGoogleCloudSTT, cleanupAll]);

  if (minimal) return errorMsg ? <p role="alert" className="form-error">{errorMsg}</p> : null;
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

          <button
            type="button"
            onClick={() => handleEngineChange("gemini-live")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedEngine === "gemini-live"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>✨ Gemini 3.5 Live</span>
          </button>

          <button
            type="button"
            onClick={() => handleEngineChange("cloud")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedEngine === "cloud"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Cloud REST</span>
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
              {selectedEngine === "gemini-live"
                ? "Gemini Live Audio:"
                : selectedEngine === "cloud"
                ? "Cloud REST Audio:"
                : "Browser Speech Mic:"}
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

      {/* Live Interim Speech Bubble */}
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
