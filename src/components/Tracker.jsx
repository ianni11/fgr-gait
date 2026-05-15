import { useRef, useState, useCallback, useEffect } from 'react';
import { computeAngles, angleStatus, ANGLE_DEFS } from '../utils/biomechanics.js';
import { drawSkeleton } from '../utils/drawSkeleton.js';
import { useMediaPipe } from '../hooks/useMediaPipe.js';
import { useSampler } from '../hooks/useSampler.js';
import AngleChart from './AngleChart.jsx';

const STATUS_COLOR = { ok: '#22c55e', warn: '#eab308', bad: '#ef4444' };
const STATUS_LABEL = { ok: '✓', warn: '⚠', bad: '✗' };

function AngleSidebar({ angles }) {
  if (angles.length === 0) return (
    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
      In attesa di rilevamento...
    </div>
  );
  return (
    <div>
      {ANGLE_DEFS.map(def => {
        const found = angles.find(a => a.key === def.key);
        if (!found) return null;
        const { deg } = found;
        const st = angleStatus(def, deg);
        const col = STATUS_COLOR[st];
        const warnSpan = def.warn[1] - def.warn[0];
        const pct = Math.max(0, Math.min(100, ((deg - def.warn[0]) / warnSpan) * 100));

        return (
          <div key={def.key} style={{ padding: '11px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{def.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: col }}>
                {STATUS_LABEL[st]} {deg}°
              </span>
            </div>
            <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: col, borderRadius: 99, transition: 'width 0.2s, background 0.2s' }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 9, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
              <span>{def.warn[0]}°</span>
              <span style={{ color: 'rgba(34,197,94,0.4)' }}>{def.ideal[0]}°–{def.ideal[1]}°</span>
              <span>{def.warn[1]}°</span>
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
        {[['#22c55e', '✓ Ideale'], ['#eab308', '⚠ Attenzione'], ['#ef4444', '✗ Critico']].map(([col, lab]) => (
          <div key={lab} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }}/>
            <span style={{ fontSize: 11, color: col, fontWeight: 600 }}>{lab}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Tracker({ user, onReportReady }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fpsRef = useRef({ count: 0, last: Date.now() });

  const [mode, setMode] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [angles, setAngles] = useState([]);
  const [fps, setFps] = useState(0);
  const [timeline, setTimeline] = useState([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const elapsedRef = useRef(null);

  const mp = useMediaPipe();
  const sampler = useSampler();

  const handlePoseResults = useCallback((results) => {
    const lm = results.poseLandmarks;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;
    const ctx = canvas.getContext('2d');
    const computed = lm ? computeAngles(lm) : [];
    drawSkeleton(ctx, lm, canvas.width, canvas.height, computed);
    setAngles(computed);
    setTracking(!!lm);

    // FPS
    fpsRef.current.count++;
    const now = Date.now();
    if (now - fpsRef.current.last >= 1000) {
      setFps(fpsRef.current.count);
      fpsRef.current = { count: 0, last: now };
    }

    // Sampler
    sampler.onFrame(computed, () => mp.captureFrame(video, canvas));

    // Update timeline for chart
    if (computed.length > 0) {
      setTimeline(prev => {
        const entry = { t: prev.length * 2 };
        computed.forEach(a => { entry[a.key] = a.deg; });
        // Keep last 200 samples max
        const next = [...prev.slice(-199), entry];
        return next;
      });
    }
  }, [sampler, mp]);

  const startWebcam = async () => {
    setMode('webcam');
    setVideoReady(false);
    setTimeline([]);
    setElapsedSec(0);
    await new Promise(r => setTimeout(r, 100));
    if (!videoRef.current) return;
    await mp.startWebcam(videoRef.current, handlePoseResults);
    videoRef.current.onloadeddata = () => setVideoReady(true);
  };

  const handleVideoFile = async (file) => {
    setMode('video');
    setVideoReady(false);
    setTimeline([]);
    setElapsedSec(0);
    await mp.startVideo(videoRef.current, file, handlePoseResults);
    videoRef.current.onloadeddata = () => setVideoReady(true);
  };

  const stopAll = () => {
    mp.stopAll(videoRef.current);
    sampler.stopRecording();
    clearInterval(elapsedRef.current);
    setMode(null); setAngles([]); setTracking(false); setVideoReady(false); setTimeline([]);
  };

  const startRecording = () => {
    sampler.startRecording();
    setTimeline([]);
    setElapsedSec(0);
    clearInterval(elapsedRef.current);
    elapsedRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
  };

  const stopAndReport = () => {
    sampler.stopRecording();
    clearInterval(elapsedRef.current);
    const report = sampler.buildReport();
    if (report) onReportReady(report);
    else alert('Raccogli almeno 3 campioni (≥6 secondi) prima di generare il report.');
  };

  useEffect(() => () => { mp.stopAll(videoRef.current); clearInterval(elapsedRef.current); }, []);

  const okCount   = angles.filter(a => angleStatus(ANGLE_DEFS.find(d=>d.key===a.key), a.deg) === 'ok').length;
  const warnCount = angles.filter(a => angleStatus(ANGLE_DEFS.find(d=>d.key===a.key), a.deg) === 'warn').length;
  const badCount  = angles.filter(a => angleStatus(ANGLE_DEFS.find(d=>d.key===a.key), a.deg) === 'bad').length;

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(6,9,18,0.95)', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1E40AF', boxShadow: '0 0 8px #1E40AF' }}/>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, letterSpacing: '0.08em' }}>
              FGR <span style={{ color: '#EA580C' }}>·</span> GAIT
            </span>
          </div>
          {tracking && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.4s infinite' }}/>
              <span style={{ fontSize: 11, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>LIVE · {fps}fps</span>
            </div>
          )}
          {sampler.isRecording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '3px 10px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 0.8s infinite' }}/>
              <span style={{ fontSize: 11, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                REC {formatTime(elapsedSec)} · {sampler.sampleCount} camp.
              </span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {user && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{user.username}</span>}
          {mode && <button onClick={stopAll} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 7, padding: '6px 14px', fontSize: 12 }}>Stop</button>}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px 60px' }}>

        {/* Mode selection */}
        {!mode && (
          <div className="fade-up">
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, letterSpacing: '0.04em', marginBottom: 8 }}>
                ANALISI <span style={{ color: '#EA580C' }}>BIOMECCANICA</span>
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 500, margin: '0 auto' }}>
                Carica il video della tua corsa per l'analisi statistica completa con distribuzione degli angoli articolari.
              </p>
            </div>

            {mp.loading && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(30,64,175,0.2)', borderTop: '3px solid #1E40AF', margin: '0 auto 14px', animation: 'spin 1s linear infinite' }}/>
                Caricamento MediaPipe...
              </div>
            )}

            {!mp.loading && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, maxWidth: 640, margin: '0 auto' }}>
                {/* Primary: video upload */}
                <label style={{
                  background: 'rgba(30,64,175,0.06)', border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: 'var(--radius-lg)', padding: '32px 24px', cursor: 'pointer',
                  display: 'block', transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 12px 40px rgba(30,64,175,0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}
                >
                  <div style={{ fontSize: 38, marginBottom: 14 }}>🎬</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '0.04em', marginBottom: 6 }}>CARICA VIDEO</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Analisi da video registrato. MP4, MOV, AVI. Il metodo consigliato per i podisti in strada.
                  </div>
                  <input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleVideoFile(e.target.files[0])}/>
                </label>

                {/* Secondary: webcam */}
                <button onClick={startWebcam} style={{
                  background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.25)',
                  borderRadius: 'var(--radius-lg)', padding: '32px 20px', cursor: 'pointer',
                  color: 'var(--text)', textAlign: 'left', transition: 'transform 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.transform='translateY(-3px)'}
                  onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
                >
                  <div style={{ fontSize: 30, marginBottom: 12 }}>📷</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, letterSpacing: '0.04em', marginBottom: 6 }}>WEBCAM<br/>LIVE</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>Per allenatori e tapis roulant</div>
                </button>
              </div>
            )}

            {/* Features */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 36, maxWidth: 640, margin: '36px auto 0' }}>
              {[['🦴','33 keypoint','Corpo completo'],['📊','Media + SD','Distribuzione statistica'],['📸','5 frame','Auto-catturati']].map(([ic,t,d])=>(
                <div key={t} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 5 }}>{ic}</div>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{t}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tracker layout */}
        {mode && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16 }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Video */}
              <div style={{ position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden', background: '#000', border: '1px solid var(--border)', aspectRatio: '16/9' }}>
                <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}/>

                {!videoReady && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(30,64,175,0.2)', borderTop: '3px solid #1E40AF', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }}/>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Inizializzazione...</div>
                    </div>
                  </div>
                )}

                {tracking && !videoReady && null}

                {/* Status bar */}
                {tracking && (
                  <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 6 }}>
                    {[['✓', okCount, '#22c55e'], ['⚠', warnCount, '#eab308'], ['✗', badCount, '#ef4444']].map(([ic, n, col]) => n > 0 && (
                      <div key={col} style={{ background: 'rgba(0,0,0,0.75)', border: `1px solid ${col}44`, borderRadius: 5, padding: '2px 8px', fontSize: 11, color: col, fontFamily: 'var(--font-mono)' }}>
                        {ic} {n}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recording controls */}
              {tracking && (
                <div style={{ display: 'flex', gap: 10 }}>
                  {!sampler.isRecording ? (
                    <button onClick={startRecording} style={{
                      flex: 1, padding: '13px', borderRadius: 'var(--radius)',
                      background: 'linear-gradient(135deg, #1E40AF, #2563eb)',
                      border: 'none', color: '#fff', fontFamily: 'var(--font-display)',
                      fontWeight: 800, fontSize: 14, letterSpacing: '0.06em',
                      boxShadow: '0 6px 24px rgba(30,64,175,0.35)',
                    }}>
                      ● AVVIA CAMPIONAMENTO
                    </button>
                  ) : (
                    <button onClick={stopAndReport} style={{
                      flex: 1, padding: '13px', borderRadius: 'var(--radius)',
                      background: 'linear-gradient(135deg, #EA580C, #dc2626)',
                      border: 'none', color: '#fff', fontFamily: 'var(--font-display)',
                      fontWeight: 800, fontSize: 14, letterSpacing: '0.06em',
                      boxShadow: '0 6px 24px rgba(234,88,12,0.35)',
                    }}>
                      ■ GENERA REPORT ({sampler.sampleCount} camp.)
                    </button>
                  )}
                </div>
              )}

              {/* Angle chart */}
              {mode && (
                <AngleChart
                  timeline={timeline}
                  currentAngles={angles}
                  isRecording={sampler.isRecording}
                />
              )}
            </div>

            {/* Right sidebar - angle list */}
            <div>
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', overflow: 'hidden', position: 'sticky', top: 70,
              }}>
                <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Angoli istantanei
                  </div>
                </div>
                <AngleSidebar angles={angles} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
