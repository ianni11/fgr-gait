import { useState, useEffect, useCallback } from 'react';

// Modalità allenatore: mostra la coda di chi ha appena firmato il consenso
// via QR (in attesa di fare il test) e permette anche di cercare per nome
// una persona che non è più "in coda" (socio vero o prospetto precedente).
export default function CoachQueue({ onSelect, onClose }) {
  const [q, setQ] = useState('');
  const [risultati, setRisultati] = useState([]);
  const [modalita, setModalita] = useState('coda');
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState('');

  const cerca = useCallback(async (query) => {
    const token = sessionStorage.getItem('fgr_token');
    if (!token) return;
    setLoading(true);
    setErrore('');
    try {
      const url = `${import.meta.env.VITE_API_BASE}/gait_prospetti_search.php?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setRisultati(data.risultati);
        setModalita(data.modalita || 'ricerca');
      } else {
        setErrore(data.message || 'Errore nella ricerca');
      }
    } catch {
      setErrore('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cerca(q); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => cerca(q), 300);
    return () => clearTimeout(t);
  }, [q, cerca]);

  const rimuovi = useCallback(async (p) => {
    if (!window.confirm(`Rimuovere ${p.nome} ${p.cognome} dalla coda? Possibile solo se non ha ancora fatto il test.`)) return;
    const token = sessionStorage.getItem('fgr_token');
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/gait_prospetti_rimuovi.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: p.id }),
      });
      const data = await res.json();
      if (data.success) {
        setRisultati(prev => prev.filter(r => !(r.tipo === p.tipo && r.id === p.id)));
      } else {
        alert(data.message || 'Impossibile rimuovere');
      }
    } catch {
      alert('Errore di connessione');
    }
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(6,9,18,0.92)',
      backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 16px', overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '0.04em' }}>
            MODALITÀ <span style={{ color: '#EA580C' }}>ALLENATORE</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Cerca per nome (lascia vuoto per la coda di oggi)"
          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-strong)', color: 'var(--text)', fontSize: 14, outline: 'none', marginBottom: 16 }}
        />

        {modalita === 'coda' && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            In attesa oggi ({risultati.length})
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>Caricamento...</div>}
        {errore && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{errore}</div>}

        {!loading && !errore && risultati.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-faint)', fontSize: 13 }}>
            {modalita === 'coda' ? 'Nessuno in attesa al momento — chi firma il consenso via QR comparirà qui.' : 'Nessun risultato.'}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {risultati.map(p => (
            <div
              key={`${p.tipo}-${p.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 14px',
              }}
            >
              <button
                onClick={() => onSelect(p)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, minWidth: 0,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{p.nome} {p.cognome}</span>
                    {p.minorenne && (
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 6px', borderRadius: 5, background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
                        🔞 Minorenne
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.contatto}</div>
                </div>
              </button>
              <span style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em',
                padding: '3px 8px', borderRadius: 6, flexShrink: 0,
                background: p.tipo === 'socio' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
                color: p.tipo === 'socio' ? '#22c55e' : '#3b82f6',
              }}>
                {p.tipo === 'socio' ? 'Socio' : 'Prospetto'}
              </span>
              {p.tipo === 'prospetto' && (
                <button
                  onClick={() => rimuovi(p)}
                  title="Rimuovi dalla coda"
                  style={{ flexShrink: 0, background: 'none', border: '1px solid var(--border)', color: 'var(--text-faint)', borderRadius: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer' }}
                >
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
