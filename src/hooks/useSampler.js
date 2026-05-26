import { useRef, useState, useCallback } from 'react';
import { pickBestFrameIndex, computeStats, sessionScore, ANGLE_DEFS } from '../utils/biomechanics.js';

const SAMPLE_INTERVAL_MS = 2000;  // ogni quanto si chiude una finestra e si salva un campione
const WINDOW_MS          = 600;   // durata della finestra di accumulo frame
const MIN_WINDOW_FRAMES  = 3;     // frame minimi per considerare valida una finestra
const MAX_FRAMES_STORED  = 5;
const MIN_VISIBILITY     = 0.55;  // Step 2: soglia visibilità keypoint

// ── Mediana array numerico ────────────────────────────────────────────────
function median(arr) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ── Controlla visibilità minima dei keypoint coinvolti in un frame ────────
function frameHasGoodVisibility(angles, lmSnapshot) {
  if (!lmSnapshot) return true; // se non abbiamo snapshot, accettiamo
  return angles.every(({ joints }) => {
    if (!joints) return true;
    return joints.every(idx => {
      const lm = lmSnapshot[idx];
      return lm && (lm.visibility ?? 1) >= MIN_VISIBILITY;
    });
  });
}

export function useSampler() {
  // Buffer finestra corrente: array di frame accumulati nell'intervallo WINDOW_MS
  const windowBufferRef  = useRef([]);   // [{key, deg}[], ...]  — frame nella finestra aperta
  const windowStartRef   = useRef(0);    // timestamp apertura finestra corrente
  const lastSampleRef    = useRef(0);    // timestamp ultimo campione salvato

  // Dati sessione
  const samplesRef       = useRef([]);   // campioni consolidati (uno per finestra)
  const frameUrlsRef     = useRef([]);
  const frameAnglesRef   = useRef([]);
  const isRecordingRef   = useRef(false);

  // Statistiche qualità
  const framesReceivedRef = useRef(0);
  const framesAcceptedRef = useRef(0);

  const [isRecording, setIsRecording]   = useState(false);
  const [sampleCount, setSampleCount]   = useState(0);

  const startRecording = useCallback(() => {
    samplesRef.current        = [];
    frameUrlsRef.current      = [];
    frameAnglesRef.current    = [];
    windowBufferRef.current   = [];
    windowStartRef.current    = 0;
    lastSampleRef.current     = 0;
    framesReceivedRef.current = 0;
    framesAcceptedRef.current = 0;
    setSampleCount(0);
    isRecordingRef.current = true;
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    // Consolida eventuale finestra parziale se ha abbastanza frame
    _consolidateWindow();
  }, []);

  // ── Consolida la finestra corrente in un campione ─────────────────────
  const _consolidateWindow = useCallback(() => {
    const buf = windowBufferRef.current;
    if (buf.length < MIN_WINDOW_FRAMES) {
      windowBufferRef.current = [];
      return;
    }

    // Per ogni angolo calcola la mediana dei valori nella finestra
    const consolidated = {};
    ANGLE_DEFS.forEach(def => { consolidated[def.key] = []; });

    buf.forEach(frame => {
      frame.forEach(({ key, deg }) => {
        if (consolidated[key] !== undefined && deg !== null) {
          consolidated[key].push(deg);
        }
      });
    });

    const sample = [];
    ANGLE_DEFS.forEach(def => {
      const vals = consolidated[def.key];
      const med = median(vals);
      if (med !== null) {
        sample.push({ key: def.key, deg: Math.round(med * 10) / 10 });
      }
    });

    if (sample.length > 0) {
      samplesRef.current.push(sample);
      setSampleCount(samplesRef.current.length);
    }

    windowBufferRef.current = [];
  }, []);

  // ── Riceve ogni frame da Tracker ─────────────────────────────────────
  const onFrame = useCallback((angles, captureFrameFn, landmarks) => {
    if (!isRecordingRef.current || angles.length === 0) return;

    const now = Date.now();
    framesReceivedRef.current++;

    // Step 2: filtra frame con visibilità bassa
    const goodVisibility = angles.every(a => {
      // usa visibility dal landmark se disponibile nell'oggetto angle
      return (a.visibility === undefined) || (a.visibility >= MIN_VISIBILITY);
    });
    if (!goodVisibility) return;
    framesAcceptedRef.current++;

    // Inizializza finestra se è la prima volta o se è passato SAMPLE_INTERVAL_MS
    if (windowStartRef.current === 0) {
      windowStartRef.current = now;
    }

    const windowAge = now - windowStartRef.current;

    if (windowAge <= WINDOW_MS) {
      // Siamo dentro la finestra — accumula il frame
      windowBufferRef.current.push(angles.map(a => ({ key: a.key, deg: a.deg })));
    } else {
      // Finestra scaduta — consolida e apri la prossima se è passato l'intervallo
      const timeSinceLastSample = now - lastSampleRef.current;

      if (timeSinceLastSample >= SAMPLE_INTERVAL_MS) {
        // Consolida finestra precedente
        _consolidateWindow();
        lastSampleRef.current  = now;
        windowStartRef.current = now;

        // Cattura frame rappresentativo se serve
        if (frameUrlsRef.current.length < MAX_FRAMES_STORED) {
          const dataUrl = captureFrameFn?.();
          if (dataUrl) {
            frameUrlsRef.current.push(dataUrl);
            frameAnglesRef.current.push(
              angles.map(a => ({ key: a.key, deg: a.deg, name: a.name }))
            );
          }
        }

        // Inizia ad accumulare il frame corrente nella nuova finestra
        windowBufferRef.current = [angles.map(a => ({ key: a.key, deg: a.deg }))];
      }
      // Se non è ancora passato SAMPLE_INTERVAL_MS, aspettiamo (finestra tra un campione e l'altro)
    }
  }, [_consolidateWindow]);

  const buildReport = useCallback(() => {
    const samples = samplesRef.current;
    if (samples.length < 3) return null;

    const stats   = computeStats(samples);
    const score   = sessionScore(stats);

    const timeline = samples.map((frame, i) => {
      const entry = { t: i * (SAMPLE_INTERVAL_MS / 1000) };
      frame.forEach(({ key, deg }) => { entry[key] = deg; });
      return entry;
    });

    // Qualità sessione: % frame accettati
    const totalFrames    = framesReceivedRef.current;
    const acceptedFrames = framesAcceptedRef.current;
    const qualityPct     = totalFrames > 0
      ? Math.round((acceptedFrames / totalFrames) * 100)
      : 100;

    return {
      stats,
      score,
      timeline,
      sampleCount:     samples.length,
      frames:          frameUrlsRef.current,
      frameAngles:     frameAnglesRef.current,
      durationSeconds: samples.length * (SAMPLE_INTERVAL_MS / 1000),
      generatedAt:     new Date().toISOString(),
      quality: {
        framesReceived: totalFrames,
        framesAccepted: acceptedFrames,
        qualityPct,
      },
    };
  }, []);

  return { isRecording, sampleCount, startRecording, stopRecording, onFrame, buildReport };
}