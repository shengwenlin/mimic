import { useState, useRef, useCallback, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function getMimeOptions(): MediaRecorderOptions {
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isSafari) {
    if (MediaRecorder.isTypeSupported("audio/mp4")) return { mimeType: "audio/mp4" };
    if (MediaRecorder.isTypeSupported("audio/aac")) return { mimeType: "audio/aac" };
  } else {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return { mimeType: "audio/webm;codecs=opus" };
    if (MediaRecorder.isTypeSupported("audio/webm")) return { mimeType: "audio/webm" };
    if (MediaRecorder.isTypeSupported("audio/mp4")) return { mimeType: "audio/mp4" };
  }
  return {};
}

export function useAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Pre-acquire mic stream on mount so recording starts instantly
  const ensureStream = useCallback(async (): Promise<MediaStream> => {
    if (streamRef.current && streamRef.current.active) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
    streamRef.current = stream;
    return stream;
  }, []);

  // Release mic on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // ─── TTS: ElevenLabs via edge function, fallback to Web Speech API ───
  const playTTS = useCallback(async (text: string): Promise<void> => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) throw new Error("ElevenLabs unavailable");

      const blob = await response.blob();
      if (blob.size < 100) throw new Error("Invalid audio");

      const url = URL.createObjectURL(blob);
      return new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onplay = () => setIsPlaying(true);
        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
          reject(new Error("Playback failed"));
        };
        audio.play().catch(reject);
      });
    } catch {
      // Fallback: Web Speech API
      console.log("Using Web Speech API fallback for TTS");
      return new Promise<void>((resolve) => {
        if (!window.speechSynthesis) {
          setIsPlaying(false);
          resolve();
          return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 0.92;
        utterance.pitch = 1;

        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(
          (v) => v.lang === "en-US" && v.name.includes("Google")
        ) || voices.find((v) => v.lang.startsWith("en-US"));
        if (voice) utterance.voice = voice;

        utterance.onend = () => { setIsPlaying(false); resolve(); };
        utterance.onerror = () => { setIsPlaying(false); resolve(); };
        window.speechSynthesis.speak(utterance);
      });
    }
  }, []);

  const recordingStartTimeRef = useRef<number>(0);

  // ─── Record mic audio ───
  const startRecording = useCallback(async (): Promise<void> => {
    chunksRef.current = [];
    const stream = await ensureStream();
    const options = getMimeOptions();
    const recorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start();
    recordingStartTimeRef.current = Date.now();
    setIsRecording(true);
  }, [ensureStream]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") { resolve(new Blob()); return; }

      // Ensure minimum 1.5s recording on iOS to get valid audio data
      const elapsed = Date.now() - recordingStartTimeRef.current;
      const minDuration = 1500;
      const delay = Math.max(0, minDuration - elapsed);

      const doStop = () => {
        if (recorder.state === "inactive") { resolve(new Blob()); return; }
        recorder.onstop = () => {
          const mimeType = recorder.mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: mimeType });
          recordedBlobRef.current = blob;
          setIsRecording(false);
          // Don't stop stream tracks — we reuse the stream
          resolve(blob);
        };
        recorder.stop();
      };

      if (delay > 0) {
        setTimeout(doStop, delay);
      } else {
        doStop();
      }
    });
  }, []);

  // ─── Play back recorded audio ───
  const playRecording = useCallback(async (): Promise<void> => {
    const blob = recordedBlobRef.current;
    if (!blob || blob.size === 0) return;
    setIsPlaying(true);
    const url = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { setIsPlaying(false); URL.revokeObjectURL(url); resolve(); };
      audio.play();
    });
  }, []);

  // ─── STT: ElevenLabs via edge function ───
  const transcribe = useCallback(async (audioBlob: Blob): Promise<{ text: string }> => {
    try {
      const formData = new FormData();
      const ext = audioBlob.type.includes("mp4") ? "mp4" : audioBlob.type.includes("ogg") ? "ogg" : "webm";
      formData.append("audio", audioBlob, `recording.${ext}`);
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/elevenlabs-stt`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: formData,
        }
      );
      if (!response.ok) throw new Error("STT unavailable");
      return response.json();
    } catch {
      console.log("STT unavailable, skipping transcription");
      return { text: "" };
    }
  }, []);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  }, []);

  return {
    isPlaying, isRecording, playTTS, startRecording,
    stopRecording, playRecording, transcribe, stopPlayback,
    ensureStream,
    hasRecording: !!recordedBlobRef.current,
  };
}
