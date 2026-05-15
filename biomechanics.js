// ── MediaPipe keypoint indices ─────────────────────────────────────────────
export const KP = {
  NOSE: 0, L_EAR: 7, R_EAR: 8,
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_ELBOW: 13, R_ELBOW: 14,
  L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24,
  L_KNEE: 25, R_KNEE: 26,
  L_ANKLE: 27, R_ANKLE: 28,
  L_HEEL: 29, R_HEEL: 30,
  L_FOOT: 31, R_FOOT: 32,
};

export const POSE_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],
  [9,10],[11,12],[11,13],[13,15],[15,17],[15,19],[17,19],
  [12,14],[14,16],[16,18],[16,20],[18,20],
  [11,23],[12,24],[23,24],
  [23,25],[25,27],[27,29],[27,31],[29,31],
  [24,26],[26,28],[28,30],[28,32],[30,32],
];

// ── Angle definitions ──────────────────────────────────────────────────────
// ideal: green band | warn: yellow band | outside warn = red
// These are population defaults; will be overridden by FGR benchmark data
export const ANGLE_DEFS = [
  {
    key: 'knee_l',
    name: 'Ginocchio SX',
    short: 'GIN SX',
    joints: [KP.L_HIP, KP.L_KNEE, KP.L_ANKLE],
    ideal: [155, 175],
    warn:  [140, 185],
    color: '#a78bfa',
  },
  {
    key: 'knee_r',
    name: 'Ginocchio DX',
    short: 'GIN DX',
    joints: [KP.R_HIP, KP.R_KNEE, KP.R_ANKLE],
    ideal: [155, 175],
    warn:  [140, 185],
    color: '#818cf8',
  },
  {
    key: 'hip_l',
    name: 'Anca SX',
    short: 'ANCA SX',
    joints: [KP.L_SHOULDER, KP.L_HIP, KP.L_KNEE],
    ideal: [160, 180],
    warn:  [145, 185],
    color: '#34d399',
  },
  {
    key: 'hip_r',
    name: 'Anca DX',
    short: 'ANCA DX',
    joints: [KP.R_SHOULDER, KP.R_HIP, KP.R_KNEE],
    ideal: [160, 180],
    warn:  [145, 185],
    color: '#2dd4bf',
  },
  {
    key: 'ankle_l',
    name: 'Caviglia SX',
    short: 'CAV SX',
    joints: [KP.L_KNEE, KP.L_ANKLE, KP.L_FOOT],
    ideal: [80, 110],
    warn:  [65, 125],
    color: '#fbbf24',
  },
  {
    key: 'ankle_r',
    name: 'Caviglia DX',
    short: 'CAV DX',
    joints: [KP.R_KNEE, KP.R_ANKLE, KP.R_FOOT],
    ideal: [80, 110],
    warn:  [65, 125],
    color: '#fb923c',
  },
  {
    key: 'trunk',
    name: 'Busto',
    short: 'BUSTO',
    joints: [KP.L_HIP, KP.L_SHOULDER, KP.NOSE],
    ideal: [75, 95],
    warn:  [65, 105],
    color: '#f472b6',
  },
];

export const JOINT_FOR_KEY = {
  knee_l:   KP.L_KNEE,
  knee_r:   KP.R_KNEE,
  hip_l:    KP.L_HIP,
  hip_r:    KP.R_HIP,
  ankle_l:  KP.L_ANKLE,
  ankle_r:  KP.R_ANKLE,
  trunk:    KP.L_SHOULDER,
};

// ── Math helpers ──────────────────────────────────────────────────────────
export function angleBetween(a, b, c) {
  if (!a || !b || !c) return null;
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const mag = Math.sqrt(ba.x**2 + ba.y**2) * Math.sqrt(bc.x**2 + bc.y**2);
  if (mag === 0) return null;
  return Math.round(Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180 / Math.PI);
}

export function computeAngles(lm) {
  const g = (i) => (lm[i]?.visibility > 0.4 ? lm[i] : null);
  return ANGLE_DEFS.map(def => {
    const [a, b, c] = def.joints;
    return { ...def, deg: angleBetween(g(a), g(b), g(c)) };
  }).filter(a => a.deg !== null);
}

export function angleStatus(def, deg) {
  if (deg >= def.ideal[0] && deg <= def.ideal[1]) return 'ok';
  if (deg >= def.warn[0]  && deg <= def.warn[1])  return 'warn';
  return 'bad';
}

// ── Statistics ────────────────────────────────────────────────────────────
export function computeStats(samples) {
  // samples: array of { key, deg }[]  (one per frame)
  const byKey = {};
  ANGLE_DEFS.forEach(d => { byKey[d.key] = []; });

  samples.forEach(frame => {
    frame.forEach(({ key, deg }) => {
      if (byKey[key] !== undefined && deg !== null) byKey[key].push(deg);
    });
  });

  const stats = {};
  ANGLE_DEFS.forEach(def => {
    const vals = byKey[def.key];
    if (vals.length === 0) { stats[def.key] = null; return; }
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
    const sd = Math.sqrt(variance);
    stats[def.key] = {
      mean: Math.round(mean * 10) / 10,
      sd: Math.round(sd * 10) / 10,
      min: Math.min(...vals),
      max: Math.max(...vals),
      count: vals.length,
      values: vals,
      status: angleStatus(def, mean),
    };
  });
  return stats;
}

// Pick the frame whose angles are closest to the session mean
export function pickBestFrameIndex(samples, stats) {
  if (samples.length === 0) return 0;
  let bestIdx = 0, bestScore = Infinity;
  samples.forEach((frame, idx) => {
    let score = 0, n = 0;
    frame.forEach(({ key, deg }) => {
      const st = stats[key];
      if (st) { score += Math.abs(deg - st.mean); n++; }
    });
    if (n > 0 && score / n < bestScore) { bestScore = score / n; bestIdx = idx; }
  });
  return bestIdx;
}

// Overall session score 0–100
export function sessionScore(stats) {
  const vals = ANGLE_DEFS.map(d => {
    const s = stats[d.key];
    if (!s) return null;
    const st = angleStatus(d, s.mean);
    return st === 'ok' ? 100 : st === 'warn' ? 55 : 15;
  }).filter(v => v !== null);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
