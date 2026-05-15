import { useRef, useState, useCallback } from 'react';

export function useMediaPipe() {
  const poseRef = useRef(null);
  const animRef = useRef(null);
  const streamRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadScripts = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window._mpLoaded) { resolve(); return; }
      setLoading(true);

      const scripts = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
      ];

      let loaded = 0;
      scripts.forEach((src, i) => {
        const s = document.createElement('script');
        s.src = src;
        s.crossOrigin = 'anonymous';
        if (i === scripts.length - 1) {
          s.onload = () => { window._mpLoaded = true; setLoading(false); resolve(); };
          s.onerror = reject;
        }
        document.head.appendChild(s);
      });
    });
  }, []);

  const initPose = useCallback(async (onResults) => {
    await loadScripts();
    const Pose = window.Pose;
    if (!Pose) return null;

    const pose = new Pose({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
    });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    pose.onResults(onResults);
    await pose.initialize();
    poseRef.current = pose;
    setLoaded(true);
    return pose;
  }, [loadScripts]);

  const startWebcam = useCallback(async (videoEl, onResults) => {
    const pose = poseRef.current || await initPose(onResults);
    if (!pose) return;
    if (poseRef.current && poseRef.current !== pose) {
      poseRef.current.onResults(onResults);
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: 'environment' },
    });
    streamRef.current = stream;
    videoEl.srcObject = stream;
    await videoEl.play();

    const loop = async () => {
      if (videoEl.readyState >= 2) await pose.send({ image: videoEl });
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
  }, [initPose]);

  const startVideo = useCallback(async (videoEl, file, onResults) => {
    const pose = poseRef.current || await initPose(onResults);
    if (!pose) return;
    if (poseRef.current) poseRef.current.onResults(onResults);

    videoEl.srcObject = null;
    videoEl.src = URL.createObjectURL(file);
    videoEl.loop = true;
    await videoEl.play();

    const loop = async () => {
      if (!videoEl.paused && videoEl.readyState >= 2) await pose.send({ image: videoEl });
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
  }, [initPose]);

  const stopAll = useCallback((videoEl) => {
    cancelAnimationFrame(animRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoEl) {
      videoEl.pause();
      videoEl.src = '';
      videoEl.srcObject = null;
    }
  }, []);

  const captureFrame = useCallback((videoEl, overlayCanvas) => {
    if (!videoEl || !overlayCanvas) return null;
    const ec = document.createElement('canvas');
    ec.width = videoEl.videoWidth || overlayCanvas.width;
    ec.height = videoEl.videoHeight || overlayCanvas.height;
    const ctx = ec.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, ec.width, ec.height);
    ctx.drawImage(overlayCanvas, 0, 0, ec.width, ec.height);
    return ec.toDataURL('image/jpeg', 0.92);
  }, []);

  return { loaded, loading, initPose, startWebcam, startVideo, stopAll, captureFrame, poseRef, animRef };
}
