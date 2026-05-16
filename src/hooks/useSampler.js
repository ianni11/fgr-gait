import { useRef, useState, useCallback } from 'react';
import { pickBestFrameIndex, computeStats, sessionScore } from '../utils/biomechanics.js';

const SAMPLE_INTERVAL_MS = 2000;
const MAX_FRAMES_STORED = 5; // keep up to 5 frame screenshots for the report

export function useSampler() {
  const samplesRef = useRef([]); // array of angle arrays
  const frameUrlsRef = useRef([]); // array of dataURLs
  const frameAnglesRef = useRef([]); // angle snapshot at capture time
  const lastSampleRef = useRef(0);
  const [sampleCount, setSampleCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(() => {
    samplesRef.current = [];
    frameUrlsRef.current = [];
    frameAnglesRef.current = [];
    lastSampleRef.current = 0;
    setSampleCount(0);
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  // Called on every pose result frame
  const onFrame = useCallback((angles, captureFrameFn) => {
    if (!isRecording || angles.length === 0) return;

    const now = Date.now();
    if (now - lastSampleRef.current < SAMPLE_INTERVAL_MS) return;
    lastSampleRef.current = now;

    console.log('CAMPIONE ACQUISITO', angles.length, 'angoli');
    // Store angle snapshot
    samplesRef.current.push(angles.map(a => ({ key: a.key, deg: a.deg })));
    setSampleCount(samplesRef.current.length);

    // Store frame screenshot (up to MAX_FRAMES_STORED, evenly spaced)
    if (frameUrlsRef.current.length < MAX_FRAMES_STORED) {
      const dataUrl = captureFrameFn?.();
      if (dataUrl) {
        frameUrlsRef.current.push(dataUrl);
        frameAnglesRef.current.push(angles.map(a => ({ key: a.key, deg: a.deg, name: a.name })));
      }
    }
  }, [isRecording]);

  const buildReport = useCallback(() => {
    const samples = samplesRef.current;
    if (samples.length < 3) return null;

    const stats = computeStats(samples);
    const score = sessionScore(stats);
    const bestIdx = pickBestFrameIndex(samples, stats);

    // Build timeline data: array of { t, angles: {key: deg} }
    const timeline = samples.map((frame, i) => {
      const entry = { t: i * (SAMPLE_INTERVAL_MS / 1000) };
      frame.forEach(({ key, deg }) => { entry[key] = deg; });
      return entry;
    });

    return {
      stats,
      score,
      timeline,
      sampleCount: samples.length,
      frames: frameUrlsRef.current,
      frameAngles: frameAnglesRef.current,
      durationSeconds: samples.length * (SAMPLE_INTERVAL_MS / 1000),
      generatedAt: new Date().toISOString(),
    };
  }, []);

  return { isRecording, sampleCount, startRecording, stopRecording, onFrame, buildReport };
}
