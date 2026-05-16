import { useState, useEffect } from 'react';
import Onboarding from './Onboarding.jsx';
import Tracker from './Tracker.jsx';
import SessionReport from './SessionReport.jsx';

export default function App() {
  const [screen, setScreen] = useState('onboarding'); // onboarding | tracker | report | history
  const [user, setUser] = useState(null);
  const [report, setReport] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    // 1. Ripristino da sessionStorage (reload browser)
    const token   = sessionStorage.getItem('fgr_token');
    const userStr = sessionStorage.getItem('fgr_user');
    if (token && userStr) {
      try {
        setUser(JSON.parse(userStr));
        setScreen('tracker');
      } catch {}
    }

    // 2. Token iniettato da Flutter PRIMA del mount React
    if (window.fgrToken) {
      const u = { username: window.fgrUsername || 'atleta' };
      sessionStorage.setItem('fgr_token', window.fgrToken);
      sessionStorage.setItem('fgr_user', JSON.stringify(u));
      setUser(u);
      setScreen('tracker');
      return;
    }

    // 3. Token iniettato da Flutter DOPO il mount
    const handleFlutterToken = (e) => {
      const { token: t, username: uname } = e.detail ?? {};
      if (!t) return;
      const u = { username: uname || 'atleta' };
      sessionStorage.setItem('fgr_token', t);
      sessionStorage.setItem('fgr_user', JSON.stringify(u));
      setUser(u);
      setScreen('tracker');
    };
    window.addEventListener('fgr-token-ready', handleFlutterToken);
    return () => window.removeEventListener('fgr-token-ready', handleFlutterToken);
  }, []);

  const handleLogin = (token, userData) => {
    setUser(userData);
    setSessionExpired(false);
  };

  const handleProceed = () => {
    setScreen('tracker');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('fgr_token');
    sessionStorage.removeItem('fgr_user');
    setUser(null);
    setReport(null);
    setSessionExpired(false);
    setScreen('onboarding');
  };

  // Chiamato dai componenti figli quando ricevono 401
  const handleSessionExpired = () => {
    setSessionExpired(true);
    sessionStorage.removeItem('fgr_token');
    sessionStorage.removeItem('fgr_user');
    setUser(null);
    setScreen('onboarding');
  };

  const handleReportReady = (reportData) => {
    setReport(reportData);

    const token = sessionStorage.getItem('fgr_token');
    if (token) {
      fetch(`${import.meta.env.VITE_API_BASE}/save_gait_session.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          score:            reportData.score,
          sample_count:     reportData.sampleCount,
          duration_seconds: reportData.durationSeconds,
          session_stats:    reportData.stats,
          timeline:         reportData.timeline,
          generated_at:     reportData.generatedAt,
        }),
      })
      .then(res => res.json())
      .then(data => { if (!data.success && data.message?.includes('scaduto')) handleSessionExpired(); })
      .catch(() => {});
    }

    setScreen('report');
  };

  const handleNewSession = () => {
    setReport(null);
    setScreen('tracker');
  };

  const handleShowHistory = () => setScreen('history');
  const handleBackFromHistory = () => setScreen('tracker');

  return (
    <>
      {/* Banner sessione scaduta — mostrato sopra l'onboarding */}
      {sessionExpired && screen === 'onboarding' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
          background: 'rgba(234,179,8,0.12)', borderBottom: '1px solid rgba(234,179,8,0.35)',
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: 'var(--font-mono)', fontSize: 13, color: '#eab308',
        }}>
          <span>⚠</span>
          <span>Sessione scaduta — effettua di nuovo il login per continuare.</span>
          <button onClick={() => setSessionExpired(false)} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: '#eab308', cursor: 'pointer', fontSize: 16,
          }}>×</button>
        </div>
      )}

      {screen === 'onboarding' && (
        <Onboarding onProceed={handleProceed} onLogin={handleLogin} />
      )}
      {screen === 'tracker' && (
        <Tracker
          user={user}
          onReportReady={handleReportReady}
          onShowHistory={handleShowHistory}
          onLogout={handleLogout}
          onSessionExpired={handleSessionExpired}
        />
      )}
      {screen === 'report' && report && (
        <SessionReport
          report={report}
          user={user}
          initialTab="stats"
          onNewSession={handleNewSession}
          onShowHistory={handleShowHistory}
          onLogout={handleLogout}
          onSessionExpired={handleSessionExpired}
        />
      )}
      {screen === 'history' && (
        <SessionReport
          report={null}
          user={user}
          initialTab="storico"
          onNewSession={handleNewSession}
          onShowHistory={handleShowHistory}
          onBack={handleBackFromHistory}
          onLogout={handleLogout}
          onSessionExpired={handleSessionExpired}
        />
      )}
    </>
  );
}