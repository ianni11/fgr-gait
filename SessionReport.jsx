import { useState } from 'react';
import { ANGLE_DEFS, angleStatus } from '../utils/biomechanics.js';

const STATUS_COLOR = { ok: '#22c55e', warn: '#eab308', bad: '#ef4444' };
const STATUS_LABEL = { ok: 'Ideale', warn: 'Attenzione', bad: 'Critico' };
const STATUS_BG    = {
  ok:   'rgba(34,197,94,0.08)',
  warn: 'rgba(234,179,8,0.08)',
  bad:  'rgba(239,68,68,0.08)',
};

function ScoreRing({ value, size = 120 }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 75 ? '#22c55e' : value >= 50 ? '#eab308' : '#ef4444';
  const label = value >= 80 ? 'OTTIMO' : value >= 65 ? 'BUONO' : value >= 50 ? 'DISCRETO' : 'DA MIGLIORARE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 10px ${color}88)` }}
        />
        <text x={size/2} y={size/2 - 6} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={size > 100 ? 28 : 20} fontWeight="800"
          fontFamily="'JetBrains Mono', monospace">{value}</text>
        <text x={size/2} y={size/2 + 16} textAnchor="middle"
          fill="rgba(255,255,255,0.3)" fontSize={10} fontFamily="'Barlow', sans-serif">/100</text>
      </svg>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, letterSpacing: '0.12em', color }}>{label}</span>
    </div>
  );
}

function AngleStatRow({ def, stat }) {
  if (!stat) return null;
  const st = angleStatus(def, stat.mean);
  const col = STATUS_COLOR[st];

  // Distribution bar: shows warn range as full width, ideal as inner band
  const warnSpan = def.warn[1] - def.warn[0];
  const idealLeft = ((def.ideal[0] - def.warn[0]) / warnSpan) * 100;
  const idealWidth = ((def.ideal[1] - def.ideal[0]) / warnSpan) * 100;
  const meanPct = Math.max(0, Math.min(100, ((stat.mean - def.warn[0]) / warnSpan) * 100));
  const sdLeft  = Math.max(0, ((stat.mean - stat.sd - def.warn[0]) / warnSpan) * 100);
  const sdWidth = Math.min(100, (stat.sd * 2 / warnSpan) * 100);

  return (
    <div style={{
      background: STATUS_BG[st],
      border: `1px solid ${col}22`,
      borderLeft: `3px solid ${col}`,
      borderRadius: '0 10px 10px 0',
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: col, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
            {def.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {STATUS_LABEL[st]} · {stat.count} campioni
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 22, color: col, lineHeight: 1 }}>
            {stat.mean}°
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
            ±{stat.sd}° SD
          </div>
        </div>
      </div>

      {/* Distribution bar */}
      <div style={{ position: 'relative', height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        {/* Ideal band */}
        <div style={{
          position: 'absolute', left: `${idealLeft}%`, width: `${idealWidth}%`,
          top: 0, height: '100%', background: 'rgba(34,197,94,0.15)',
          borderLeft: '1px solid rgba(34,197,94,0.3)', borderRight: '1px solid rgba(34,197,94,0.3)',
        }}/>
        {/* SD band */}
        <div style={{
          position: 'absolute', left: `${sdLeft}%`, width: `${sdWidth}%`,
          top: '25%', height: '50%', background: `${col}33`, borderRadius: 2,
        }}/>
        {/* Mean marker */}
        <div style={{
          position: 'absolute', left: `${meanPct}%`, top: 0, width: 2, height: '100%',
          background: col, transform: 'translateX(-50%)',
          boxShadow: `0 0 6px ${col}`,
        }}/>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>
        <span>{def.warn[0]}°</span>
        <span style={{ color: 'rgba(34,197,94,0.5)' }}>▏{def.ideal[0]}°–{def.ideal[1]}°▕ ideale</span>
        <span>{def.warn[1]}°</span>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        <span style={{ color: 'var(--text-muted)' }}>min <strong style={{ color: def.color }}>{stat.min}°</strong></span>
        <span style={{ color: 'var(--text-muted)' }}>max <strong style={{ color: def.color }}>{stat.max}°</strong></span>
        <span style={{ color: 'var(--text-muted)' }}>range <strong style={{ color: 'var(--text)' }}>{stat.max - stat.min}°</strong></span>
      </div>
    </div>
  );
}

function CriticalityBadge({ stats }) {
  const critical = ANGLE_DEFS.filter(d => {
    const s = stats[d.key];
    return s && angleStatus(d, s.mean) === 'bad';
  });
  const warnings = ANGLE_DEFS.filter(d => {
    const s = stats[d.key];
    return s && angleStatus(d, s.mean) === 'warn';
  });
  const ok = ANGLE_DEFS.filter(d => {
    const s = stats[d.key];
    return s && angleStatus(d, s.mean) === 'ok';
  });

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {ok.length > 0 && (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
          ✓ {ok.length} ideali
        </div>
      )}
      {warnings.length > 0 && (
        <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#eab308', fontFamily: 'var(--font-mono)' }}>
          ⚠ {warnings.length} da monitorare
        </div>
      )}
      {critical.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
          ✗ {critical.length} critici
        </div>
      )}
    </div>
  );
}

export default function SessionReport({ report, user, onNewSession }) {
  const [activeTab, setActiveTab] = useState('stats');
  const { stats, score, timeline, sampleCount, frames, frameAngles, durationSeconds, generatedAt } = report;

  const date = new Date(generatedAt).toLocaleString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const tabs = [
    { id: 'stats', label: 'Statistiche' },
    { id: 'frames', label: `Frame (${frames.length})` },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div style={{ minHeight: '100vh', padding: '24px 16px 60px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, letterSpacing: '0.04em' }}>
                REPORT <span style={{ color: '#EA580C' }}>BIOMECCANICO</span>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {user ? <><strong style={{ color: 'var(--text)' }}>{user.username || user.nome}</strong> · </> : ''}
              {date} · {sampleCount} campioni · {Math.round(durationSeconds)}s
            </div>
          </div>
          <button onClick={onNewSession} style={{
            padding: '10px 20px', borderRadius: 'var(--radius)',
            background: 'rgba(30,64,175,0.15)', border: '1px solid rgba(59,130,246,0.3)',
            color: '#3b82f6', fontSize: 13, fontWeight: 600,
          }}>
            + Nuova sessione
          </button>
        </div>

        {/* Score + summary */}
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: 24, alignItems: 'center' }}>
          <ScoreRing value={score} size={130} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, letterSpacing: '0.06em', marginBottom: 12 }}>
              RIEPILOGO SESSIONE
            </div>
            <CriticalityBadge stats={stats} />
            <p style={{ marginTop: 14, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7 }}>
              {score >= 80
                ? 'Ottima sessione biomeccanica. La maggior parte degli angoli rientra nei range ideali con bassa variabilità. Continua così e ripeti l\'analisi tra 4–6 settimane.'
                : score >= 60
                ? 'Sessione discreta. Alcuni angoli mostrano criticità moderate. Consulta le statistiche per i dettagli e considera di lavorare sulle zone segnalate.'
                : 'Sessione con criticità evidenti. Diversi angoli sono fuori range. Ti consigliamo di consultare un tecnico o fisioterapista prima della prossima sessione.'
              }
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 20px', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 400,
              color: activeTab === tab.id ? '#3b82f6' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: -1, fontFamily: 'var(--font-display)', letterSpacing: '0.04em',
              textTransform: 'uppercase', fontSize: 12,
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: Statistics */}
        {activeTab === 'stats' && (
          <div className="fade-up stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ANGLE_DEFS.map(def => (
              <div key={def.key} className="fade-up">
                <AngleStatRow def={def} stat={stats[def.key]} />
              </div>
            ))}
          </div>
        )}

        {/* TAB: Frames */}
        {activeTab === 'frames' && (
          <div className="fade-up">
            {frames.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                Nessun frame catturato durante la sessione.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {frames.map((url, i) => {
                  const fa = frameAngles[i] || [];
                  return (
                    <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                      <img src={url} alt={`Frame ${i+1}`} style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }} />
                      <div style={{ padding: '12px' }}>
                        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8 }}>
                          Frame {i + 1} · t={i * 2 * (Math.floor(sampleCount / Math.max(frames.length,1)))}s
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {fa.slice(0, 4).map(({ key, deg, name }) => {
                            const def = ANGLE_DEFS.find(d => d.key === key);
                            if (!def) return null;
                            const st = angleStatus(def, deg);
                            const col = STATUS_COLOR[st];
                            return (
                              <span key={key} style={{
                                background: `${col}15`, border: `1px solid ${col}33`,
                                color: col, borderRadius: 5, padding: '2px 7px',
                                fontSize: 10, fontFamily: 'var(--font-mono)',
                              }}>
                                {def.short} {deg}°
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: Timeline */}
        {activeTab === 'timeline' && (
          <div className="fade-up">
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
                Ogni punto rappresenta un campione acquisito ogni 2 secondi. La banda verde indica il range ideale per ciascuna articolazione. La linea colorata indica lo stato (verde/giallo/rosso) al momento del campionamento.
              </p>
              {ANGLE_DEFS.map(def => {
                const vals = timeline.map(s => s[def.key]).filter(v => v != null);
                if (vals.length === 0) return null;
                const stat = stats[def.key];
                return (
                  <div key={def.key} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                      <span style={{ fontWeight: 600, color: def.color, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>{def.name}</span>
                      {stat && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>μ={stat.mean}° σ={stat.sd}°</span>}
                    </div>
                    <div style={{ position: 'relative', height: 40, background: 'rgba(255,255,255,0.03)', borderRadius: 6, overflow: 'hidden' }}>
                      {/* Ideal band */}
                      {(() => {
                        const span = def.warn[1] - def.warn[0];
                        const idealL = ((def.ideal[0] - def.warn[0]) / span) * 100;
                        const idealW = ((def.ideal[1] - def.ideal[0]) / span) * 100;
                        return <div style={{ position: 'absolute', left: `${idealL}%`, width: `${idealW}%`, top: 0, height: '100%', background: 'rgba(34,197,94,0.1)' }} />;
                      })()}
                      {/* Data points */}
                      {vals.map((deg, i) => {
                        const span = def.warn[1] - def.warn[0];
                        const xPct = timeline.length > 1 ? (i / (timeline.length - 1)) * 100 : 50;
                        const yPct = Math.max(0, Math.min(100, 100 - ((deg - def.warn[0]) / span) * 100));
                        const st = angleStatus(def, deg);
                        const col = STATUS_COLOR[st];
                        return (
                          <div key={i} style={{
                            position: 'absolute',
                            left: `${xPct}%`, top: `${yPct}%`,
                            width: 6, height: 6, borderRadius: '50%',
                            background: col, transform: 'translate(-50%, -50%)',
                            boxShadow: `0 0 4px ${col}`,
                          }} title={`t=${i*2}s: ${deg}°`} />
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>
                      <span>0s</span>
                      <span>{Math.round(durationSeconds)}s</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Save hint */}
        {!user && (
          <div className="fade-up" style={{
            marginTop: 28, background: 'rgba(30,64,175,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 'var(--radius)', padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center',
          }}>
            <span style={{ fontSize: 20 }}>💾</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>Salva questo report</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Accedi con il tuo account FGR per salvare l'analisi e confrontarla con le sessioni future.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
