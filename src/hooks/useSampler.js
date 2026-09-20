import { useRef, useState, useCallback } from 'react';
import { pickBestFrameIndex, computeStats, sessionScore, ANGLE_DEFS, DEFAULT_PRESET } from '../utils/biomechanics.js';

const FRAME_MIN_INTERVAL_MS = 120;  // accetta max ~8 frame/s per evitare ridondanza
const MAX_FRAMES_STORED     = 5;
const MIN_LATERAL_FRAMES    = 10;   // frame laterali minimi per report valido

export function useSampler() {
  // Buffer frame laterali accettati
  const lateralFramesRef    = useRef([]);
  const lastFrameTimeRef    = useRef(0);
  const firstFrameTimeRef   = useRef(0);   // timestamp primo frame laterale accettato
  const lastAcceptedTimeRef = useRef(0);   // timestamp ultimo frame laterale accettato
  const isRecordingRef      = useRef(false);

  // Frame catturati per la visualizzazione
  const frameUrlsRef        = useRef([]);
  const frameAnglesRef      = useRef([]);
  const lastCaptureIdxRef   = useRef(0);

  // Statistiche qualità
  const framesReceivedRef   = useRef(0);
  const framesAcceptedRef   = useRef(0);

  // Preset corrente
  const presetRef           = useRef(DEFAULT_PRESET);
  // Persona per cui si registra (modalità allenatore) — null = sessione personale
  const targetRef           = useRef(null);

  const [isRecording, setIsRecording]   = useState(false);
  const [lateralCount, setLateralCount] = useState(0);

  const startRecording = useCallback((preset = DEFAULT_PRESET, target = null) => {
    lateralFramesRef.current    = [];
    frameUrlsRef.current        = [];
    frameAnglesRef.current      = [];
    lastFrameTimeRef.current    = 0;
    firstFrameTimeRef.current   = 0;
    lastAcceptedTimeRef.current = 0;
    lastCaptureIdxRef.current   = 0;
    framesReceivedRef.current   = 0;
    framesAcceptedRef.current   = 0;
    presetRef.current           = preset;
    targetRef.current           = target;
    setLateralCount(0);
    isRecordingRef.current = true;
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
  }, []);

  // ── Riceve ogni frame con score lateralità già calcolato da Tracker ──────
  const onFrame = useCallback((angles, captureFrameFn, lateralityScore) => {
    if (!isRecordingRef.current || angles.length === 0) return;

    const now = Date.now();
    framesReceivedRef.current++;

    // Throttle: non accettare frame troppo ravvicinati
    if (now - lastFrameTimeRef.current < FRAME_MIN_INTERVAL_MS) return;

    // Filtro lateralità: scarta frame non sufficientemente laterali
    const threshold = presetRef.current?.threshold ?? DEFAULT_PRESET.threshold;
    if ((lateralityScore ?? 0) < threshold) return;

    framesAcceptedRef.current++;
    lastFrameTimeRef.current = now;

    // Registra timestamp primo e ultimo frame accettato per durationSeconds reale
    if (firstFrameTimeRef.current === 0) firstFrameTimeRef.current = now;
    lastAcceptedTimeRef.current = now;

    // Accumula frame laterale
    lateralFramesRef.current.push(
      angles.map(a => ({ key: a.key, deg: a.deg }))
    );
    setLateralCount(lateralFramesRef.current.length);

    // Cattura frame visivo ogni ~20 frame laterali accettati
    const captureEvery = 20;
    if (
      frameUrlsRef.current.length < MAX_FRAMES_STORED &&
      lateralFramesRef.current.length - lastCaptureIdxRef.current >= captureEvery
    ) {
      const dataUrl = captureFrameFn?.();
      if (dataUrl) {
        frameUrlsRef.current.push(dataUrl);
        frameAnglesRef.current.push(
          angles.map(a => ({ key: a.key, deg: a.deg, name: a.name }))
        );
        lastCaptureIdxRef.current = lateralFramesRef.current.length;
      }
    }
  }, []);

  // ── Costruisce il report finale ─────────────────────────────────────────
  const buildReport = useCallback(() => {
    const frames = lateralFramesRef.current;
    if (frames.length < MIN_LATERAL_FRAMES) return null;

    // Distribuisce uniformemente i frame per timeline (max 30 punti)
    const N_TIMELINE = Math.min(frames.length, 30);
    const step = Math.max(1, Math.floor(frames.length / N_TIMELINE));
    const timelineSamples = [];
    for (let i = 0; i < frames.length; i += step) {
      timelineSamples.push(frames[i]);
    }

    const stats = computeStats(timelineSamples);
    const score = sessionScore(stats);

    const timeline = timelineSamples.map((frame, i) => {
      const entry = { t: i * 2 };
      frame.forEach(({ key, deg }) => { entry[key] = deg; });
      return entry;
    });

    // Durata reale: intervallo tra primo e ultimo frame laterale accettato
    const durationSeconds = firstFrameTimeRef.current > 0
      ? Math.round((lastAcceptedTimeRef.current - firstFrameTimeRef.current) / 1000)
      : 0;

    const totalFrames    = framesReceivedRef.current;
    const acceptedFrames = framesAcceptedRef.current;
    const qualityPct     = totalFrames > 0
      ? Math.round((acceptedFrames / totalFrames) * 100)
      : 100;

    return {
      stats,
      score,
      timeline,
      sampleCount:     timelineSamples.length,
      frames:          frameUrlsRef.current,
      frameAngles:     frameAnglesRef.current,
      durationSeconds,
      generatedAt:     new Date().toISOString(),
      target:          targetRef.current, // { tipo: 'socio'|'prospetto', id, nome, cognome } | null = sessione personale
      quality: {
        framesReceived:  totalFrames,
        framesAccepted:  acceptedFrames,
        lateralFrames:   frames.length,
        qualityPct,
        preset:          presetRef.current?.id ?? 'strada',
      },
    };
  }, []);

  return {
    isRecording,
    sampleCount: lateralCount,
    startRecording,
    stopRecording,
    onFrame,
    buildReport,
  };
}