"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecorderState = "idle" | "recording" | "error";

export type RecordedClip = {
  blob: Blob;
  durationMs: number;
};

const MAX_DURATION_MS = 5 * 60 * 1000;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "";
}

/**
 * Microphone recording via MediaRecorder. Returns control handlers plus a
 * live elapsed timer; the consumer decides whether to send or discard the clip.
 */
export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveRef = useRef<((clip: RecordedClip | null) => void) | null>(null);

  const cleanupStream = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const isSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const start = useCallback(async () => {
    if (!isSupported || state === "recording") {
      return false;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const durationMs = Math.min(MAX_DURATION_MS, Date.now() - startedAtRef.current);
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        cleanupStream();
        setState("idle");
        setElapsedMs(0);
        const resolve = resolveRef.current;
        resolveRef.current = null;
        if (resolve) {
          resolve(blob.size > 0 ? { blob, durationMs } : null);
        }
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setState("recording");
      tickRef.current = setInterval(() => {
        const next = Date.now() - startedAtRef.current;
        setElapsedMs(next);
        if (next >= MAX_DURATION_MS) {
          recorderRef.current?.stop();
        }
      }, 200);
      return true;
    } catch {
      cleanupStream();
      setState("error");
      setError("Microphone access was blocked. Allow it in your browser settings.");
      return false;
    }
  }, [cleanupStream, isSupported, state]);

  /** Stops recording and resolves with the captured clip (or null if empty). */
  const stop = useCallback((): Promise<RecordedClip | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      resolveRef.current = resolve;
      recorder.stop();
    });
  }, []);

  /** Aborts the current recording and discards audio. */
  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    resolveRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => cleanupStream();
      recorder.stop();
    } else {
      cleanupStream();
    }
    setState("idle");
    setElapsedMs(0);
  }, [cleanupStream]);

  useEffect(() => {
    return () => {
      resolveRef.current = null;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      cleanupStream();
    };
  }, [cleanupStream]);

  return { state, elapsedMs, error, isSupported, start, stop, cancel };
}
