import { useRef, useEffect, useCallback } from 'react';
import { ANGLE_DEFS, angleStatus } from '../utils/biomechanics.js';

const WINDOW_SECONDS = 12;   // visible time window
const PX_PER_SECOND = 28;    // horizontal scale
const LANE_H = 54;           // height per angle lane
const LABEL_W = 70;          // left label column width
const PAD_T = 8;
const PAD_B = 8;

const STATUS_COLOR = { ok: '#22c55e', warn: '#eab308', bad: '#ef4444' };

export default function AngleChart({ timeline, currentAngles, isRecording }) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const chartW = W - LABEL_W;

    ANGLE_DEFS.forEach((def, laneIdx) => {
      const y0 = PAD_T + laneIdx * LANE_H;
      const yMid = y0 + LANE_H / 2;
      const yRange = LANE_H - PAD_T - PAD_B;

      // Lane separator
      ctx.fillStyle = laneIdx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent';
      ctx.fillRect(LABEL_W, y0, chartW, LANE_H);

      // Lane label
      ctx.font = `600 10px 'JetBrains Mono', monospace`;
      ctx.fillStyle = def.color;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.short, LABEL_W - 8, yMid);

      if (timeline.length < 2) return;

      const totalSec = (timeline.length - 1) * 2; // 2s per sample
      const visibleSec = Math.min(totalSec, WINDOW_SECONDS);
      const startSec = Math.max(0, totalSec - WINDOW_SECONDS);

      // Ideal band
      const degToY = (deg) => {
        const center = (def.warn[0] + def.warn[1]) / 2;
        const span = def.warn[1] - def.warn[0];
        const norm = (deg - center) / span; // -0.5 to +0.5
        return yMid - norm * yRange;
      };

      const idealTop = degToY(def.ideal[1]);
      const idealBot = degToY(def.ideal[0]);
      ctx.fillStyle = 'rgba(34,197,94,0.08)';
      ctx.fillRect(LABEL_W, idealTop, chartW, idealBot - idealTop);
      ctx.strokeStyle = 'rgba(34,197,94,0.2)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(LABEL_W, idealTop);
      ctx.lineTo(W, idealTop);
      ctx.moveTo(LABEL_W, idealBot);
      ctx.lineTo(W, idealBot);
      ctx.stroke();

      // Clip to chart area
      ctx.save();
      ctx.beginPath();
      ctx.rect(LABEL_W, y0, chartW, LANE_H);
      ctx.clip();

      // Data line
      ctx.beginPath();
      let firstPoint = true;
      timeline.forEach((sample, i) => {
        const deg = sample[def.key];
        if (deg == null) return;
        const sampleSec = i * 2;
        if (sampleSec < startSec) return;

        const xNorm = (sampleSec - startSec) / visibleSec;
        const x = LABEL_W + xNorm * chartW;
        const y = degToY(deg);
        const st = angleStatus(def, deg);
        const col = STATUS_COLOR[st];

        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.shadowColor = col;
        ctx.shadowBlur = 4;

        if (firstPoint) { ctx.moveTo(x, y); firstPoint = false; }
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Current value dot (rightmost)
      const last = timeline[timeline.length - 1];
      if (last) {
        const deg = last[def.key];
        if (deg != null) {
          const st = angleStatus(def, deg);
          const col = STATUS_COLOR[st];
          const x = LABEL_W + chartW - 4;
          const y = degToY(deg);
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = col;
          ctx.shadowColor = col;
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Value label
          ctx.font = `bold 10px 'JetBrains Mono', monospace`;
          ctx.fillStyle = col;
          ctx.textAlign = 'left';
          ctx.fillText(`${deg}°`, x + 8, y + 1);
        }
      }

      ctx.restore();

      // Lane bottom border
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y0 + LANE_H);
      ctx.lineTo(W, y0 + LANE_H);
      ctx.stroke();
    });

    // Time axis
    if (timeline.length > 1) {
      const totalSec = (timeline.length - 1) * 2;
      const visibleSec = Math.min(totalSec, WINDOW_SECONDS);
      const startSec = Math.max(0, totalSec - WINDOW_SECONDS);
      const H_total = PAD_T + ANGLE_DEFS.length * LANE_H;

      ctx.font = `9px 'JetBrains Mono', monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.textAlign = 'center';
      for (let s = 0; s <= visibleSec; s += 4) {
        const x = LABEL_W + (s / visibleSec) * (W - LABEL_W);
        ctx.fillText(`${Math.round(startSec + s)}s`, x, H_total + 12);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, PAD_T);
        ctx.lineTo(x, H_total);
        ctx.stroke();
      }
    }

    // "RECORDING" pill
    if (isRecording) {
      ctx.fillStyle = 'rgba(239,68,68,0.15)';
      ctx.strokeStyle = 'rgba(239,68,68,0.5)';
      ctx.lineWidth = 1;
      const pill = { x: W - 100, y: 6, w: 90, h: 18, r: 9 };
      ctx.beginPath();
      ctx.roundRect(pill.x, pill.y, pill.w, pill.h, pill.r);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.font = `bold 9px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('● CAMPIONAMENTO', pill.x + pill.w / 2, pill.y + 12);
    }
  }, [timeline, currentAngles, isRecording]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = PAD_T + ANGLE_DEFS.length * LANE_H + 20;
      draw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  const totalH = PAD_T + ANGLE_DEFS.length * LANE_H + 20;

  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 600 }}>
          Andamento angoli · ultimi {WINDOW_SECONDS}s
        </span>
        <div style={{ display: 'flex', gap: 12, fontSize: 9, fontFamily: 'var(--font-mono)' }}>
          {[['#22c55e', 'Ideale'], ['#eab308', 'Attenzione'], ['#ef4444', 'Critico']].map(([c, l]) => (
            <span key={l} style={{ color: c, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 2, background: c, display: 'inline-block', borderRadius: 1 }} />
              {l}
            </span>
          ))}
          <span style={{ color: 'rgba(34,197,94,0.6)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'inline-block', borderRadius: 1 }} />
            Range ideale
          </span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: totalH }}
      />
    </div>
  );
}
