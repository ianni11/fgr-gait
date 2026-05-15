import { useState } from 'react';

const STEPS = [
  {
    icon: '📐',
    title: 'Posiziona lo smartphone',
    body: 'Appoggialo su un muretto, ringhiera o panchina all\'altezza del tuo bacino (≈ 90–100 cm da terra). Orientalo orizzontale.',
  },
  {
    icon: '📏',
    title: 'Distanza corretta',
    body: 'Mantieni 3–6 metri tra lo smartphone e il tuo piano di corsa. La telecamera deve essere perfettamente laterale a te, non frontale.',
  },
  {
    icon: '🏃',
    title: 'Corri parallelo alla camera',
    body: 'Indossa abbigliamento aderente (pantaloncini corti, maglia slim). Fai almeno 4 passaggi in linea retta di 15 m davanti alla camera.',
  },
  {
    icon: '☀️',
    title: 'Luce e superficie',
    body: 'Preferisci luce naturale. Evita il controluce (non correre verso il sole). Scegli una superficie piana e rettilinea.',
  },
  {
    icon: '🎬',
    title: 'Carica il video',
    body: 'Riprendi a casa o sul campo. 60 secondi sono sufficienti. Poi caricalo nel tool — lo analizziamo frame per frame.',
  },
];

function SetupIllustration() {
  return (
    <svg viewBox="0 0 420 200" style={{ width: '100%', maxWidth: 420, display: 'block', margin: '0 auto' }}>
      {/* Ground */}
      <line x1="20" y1="170" x2="400" y2="170" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeDasharray="6,4"/>

      {/* Phone on stand */}
      <rect x="28" y="120" width="28" height="44" rx="4" fill="rgba(30,64,175,0.5)" stroke="#3b82f6" strokeWidth="1.5"/>
      <rect x="31" y="123" width="22" height="35" rx="2" fill="rgba(59,130,246,0.2)"/>
      {/* lens */}
      <circle cx="42" cy="128" r="3" fill="#3b82f6" opacity="0.8"/>
      {/* stand */}
      <line x1="42" y1="164" x2="42" y2="170" stroke="#3b82f6" strokeWidth="2"/>
      <line x1="30" y1="170" x2="54" y2="170" stroke="#3b82f6" strokeWidth="2"/>

      {/* Distance arrow */}
      <line x1="60" y1="160" x2="200" y2="160" stroke="rgba(234,88,12,0.6)" strokeWidth="1" strokeDasharray="4,3"/>
      <text x="130" y="155" textAnchor="middle" fill="#EA580C" fontSize="10" fontFamily="JetBrains Mono, monospace">3–6 m</text>
      <polygon points="60,158 68,154 68,162" fill="#EA580C" opacity="0.7"/>
      <polygon points="200,158 192,154 192,162" fill="#EA580C" opacity="0.7"/>

      {/* Runner silhouette */}
      {/* Head */}
      <circle cx="230" cy="105" r="12" fill="none" stroke="#f0f4ff" strokeWidth="1.5" opacity="0.7"/>
      {/* Torso */}
      <line x1="230" y1="117" x2="228" y2="145" stroke="#f0f4ff" strokeWidth="2" opacity="0.7"/>
      {/* Left arm */}
      <line x1="228" y1="122" x2="210" y2="135" stroke="#f0f4ff" strokeWidth="1.5" opacity="0.5"/>
      {/* Right arm */}
      <line x1="228" y1="122" x2="248" y2="132" stroke="#f0f4ff" strokeWidth="1.5" opacity="0.5"/>
      {/* Left leg */}
      <line x1="228" y1="145" x2="215" y2="160" stroke="#f0f4ff" strokeWidth="2" opacity="0.7"/>
      <line x1="215" y1="160" x2="210" y2="170" stroke="#f0f4ff" strokeWidth="2" opacity="0.7"/>
      {/* Right leg */}
      <line x1="228" y1="145" x2="240" y2="158" stroke="#f0f4ff" strokeWidth="2" opacity="0.7"/>
      <line x1="240" y1="158" x2="248" y2="170" stroke="#f0f4ff" strokeWidth="2" opacity="0.7"/>

      {/* Skeleton joints overlay */}
      {[[230,105],[228,130],[215,160],[240,158],[210,170],[248,170]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="4" fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.7"/>
      ))}

      {/* Height marker */}
      <line x1="80" y1="140" x2="80" y2="170" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <line x1="76" y1="140" x2="84" y2="140" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <line x1="76" y1="170" x2="84" y2="170" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <text x="96" y="158" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="JetBrains Mono, monospace">90–100cm</text>

      {/* Direction arrows */}
      <text x="300" y="148" fill="rgba(234,88,12,0.7)" fontSize="18">→</text>
      <text x="260" y="148" fill="rgba(234,88,12,0.4)" fontSize="14">→</text>
    </svg>
  );
}

export default function Onboarding({ onProceed, onLogin }) {
  const [step, setStep] = useState(0); // 0=guide, 1=login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username || !password) { setError('Inserisci username e password'); return; }
    setLogging(true);
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        sessionStorage.setItem('fgr_token', data.token);
        sessionStorage.setItem('fgr_user', JSON.stringify({ username, ...data.user }));
        onLogin?.(data.token, data.user);
        onProceed();
      } else {
        setError(data.message || 'Credenziali non valide');
      }
    } catch {
      setError('Errore di connessione. Riprova.');
    } finally {
      setLogging(false);
    }
  };

  const skipLogin = () => {
    // Guest mode — no saving to DB
    sessionStorage.removeItem('fgr_token');
    onProceed();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 14, marginBottom: 8,
          background: 'linear-gradient(135deg, rgba(30,64,175,0.4), rgba(234,88,12,0.2))',
          border: '1px solid rgba(59,130,246,0.3)', borderRadius: 16, padding: '12px 24px',
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32">
            <circle cx="16" cy="8" r="5" fill="none" stroke="#3b82f6" strokeWidth="2"/>
            <line x1="16" y1="13" x2="14" y2="22" stroke="#3b82f6" strokeWidth="2"/>
            <line x1="14" y1="17" x2="8" y2="20" stroke="#3b82f6" strokeWidth="1.5"/>
            <line x1="14" y1="17" x2="20" y2="19" stroke="#3b82f6" strokeWidth="1.5"/>
            <line x1="14" y1="22" x2="10" y2="30" stroke="#EA580C" strokeWidth="2"/>
            <line x1="14" y1="22" x2="18" y2="30" stroke="#3b82f6" strokeWidth="2"/>
          </svg>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: '0.06em', color: '#f0f4ff' }}>
              FGR <span style={{ color: '#EA580C' }}>·</span> GAIT
            </div>
            <div style={{ fontSize: 10, color: 'rgba(240,244,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Analisi Biomeccanica
            </div>
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 460, lineHeight: 1.7 }}>
          Tracciamento posturale real-time · Distribuzione statistica degli angoli · Report evoluzione nel tempo
        </p>
      </div>

      {step === 0 && (
        <div style={{ width: '100%', maxWidth: 680 }} className="fade-up">
          <div style={{
            background: 'rgba(30,64,175,0.06)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 32px',
            marginBottom: 24,
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '0.05em', marginBottom: 20, color: '#f0f4ff' }}>
              COME PREPARARE IL TUO VIDEO
            </h2>
            <SetupIllustration />
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }} className="stagger">
              {STEPS.map((s, i) => (
                <div key={i} className="fade-up" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: 'rgba(30,64,175,0.3)',
                    border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 18, flexShrink: 0,
                  }}>{s.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{s.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setStep(1)} style={{
              flex: 1, padding: '14px', borderRadius: 'var(--radius)',
              background: 'linear-gradient(135deg, #1E40AF, #2563eb)',
              border: 'none', color: '#fff', fontFamily: 'var(--font-display)',
              fontWeight: 800, fontSize: 16, letterSpacing: '0.06em',
              boxShadow: '0 8px 32px rgba(30,64,175,0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
            >
              HO CAPITO · ACCEDI
            </button>
            <button onClick={skipLogin} style={{
              padding: '14px 20px', borderRadius: 'var(--radius)',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 13,
            }}>
              Prova senza account
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ width: '100%', maxWidth: 380 }} className="fade-up">
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '32px',
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '0.05em', marginBottom: 6 }}>
              ACCEDI
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
              Usa le credenziali del tuo account FGR per salvare i report e confrontarli nel tempo.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Username
                </label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="es. m.ianni"
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 9,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-strong)',
                    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 9,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-strong)',
                    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444' }}>
                  {error}
                </div>
              )}

              <button onClick={handleLogin} disabled={logging} style={{
                padding: '13px', borderRadius: 'var(--radius)',
                background: logging ? 'rgba(30,64,175,0.4)' : 'linear-gradient(135deg, #1E40AF, #2563eb)',
                border: 'none', color: '#fff', fontFamily: 'var(--font-display)',
                fontWeight: 800, fontSize: 16, letterSpacing: '0.06em',
                cursor: logging ? 'not-allowed' : 'pointer',
              }}>
                {logging ? 'Accesso in corso...' : 'ACCEDI'}
              </button>

              <button onClick={skipLogin} style={{
                padding: '10px', background: 'none', border: 'none',
                color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
              }}>
                Continua senza account →
              </button>
            </div>
          </div>
          <button onClick={() => setStep(0)} style={{
            marginTop: 16, background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: 'pointer',
          }}>
            ← Torna alla guida
          </button>
        </div>
      )}
    </div>
  );
}
