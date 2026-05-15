import { POSE_CONNECTIONS, JOINT_FOR_KEY, angleStatus } from './biomechanics.js';

const STATUS_COLOR = {
  ok:   '#22c55e',
  warn: '#eab308',
  bad:  '#ef4444',
};

export function drawSkeleton(ctx, lm, w, h, angles) {
  ctx.clearRect(0, 0, w, h);
  if (!lm || lm.length === 0) return;

  const pt = (i) => {
    const p = lm[i];
    if (!p || p.visibility < 0.3) return null;
    return { x: p.x * w, y: p.y * h };
  };

  // Connections
  POSE_CONNECTIONS.forEach(([a, b]) => {
    const pa = pt(a), pb = pt(b);
    if (!pa || !pb) return;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.strokeStyle = 'rgba(59,130,246,0.75)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // Keypoints
  lm.forEach((p, i) => {
    const pp = pt(i);
    if (!pp) return;
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#1E40AF';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Angle overlays on joints
  angles.forEach((angle) => {
    const idx = JOINT_FOR_KEY[angle.key];
    const pp = pt(idx);
    if (!pp || angle.deg === null) return;
    const st = angleStatus(angle, angle.deg);
    const col = STATUS_COLOR[st];
    const r = 24;

    ctx.beginPath();
    ctx.arc(pp.x, pp.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = col + '28';
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = col;
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${angle.deg}°`, pp.x, pp.y);
  });
}
