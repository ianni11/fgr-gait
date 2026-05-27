import { useState, useEffect } from 'react';
import Onboarding from './Onboarding.jsx';
import Tracker from './Tracker.jsx';
import SessionReport from './SessionReport.jsx';
import { DEFAULT_PRESET } from '../utils/biomechanics.js';

export default function App() {
  const [screen, setScreen] = useState('onboarding');
  const [user, setUser]     = useState(null);
  const [report, setReport] = useState(null);
  const [preset, setPreset] = useState(DEFAULT_PRESET);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const token   = sessionStorage.getItem('fgr_token');
    const userStr = sessionStorage.getItem('fgr_user');
    const presetStr = sessionStorage.getItem('fgr_preset');
    if (token && userStr) {
      try {
        setUser(JSON.parse(userStr));
        if (presetStr) setPreset(JSON.parse(presetStr));
        setScreen('tracker');
      } catch {}
    }

    if (window.fgrToken) {
      const u = { username: window.fgrUsername || 'atleta' };
      sessionStorage.setItem('fgr_token', window.fgrToken);
      sessionStorage.setItem('fgr_user', JSON.stringify(u));
      setUser(u);
      setScreen('tracker');
      return;
    }

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

  // onProceed ora riceve il preset scelto nell'onboarding
  const handleProceed = (chosenPreset) => {
    if (chosenPreset) {
      setPreset(chosenPreset);
      sessionStorage.setItem('fgr_preset', JSON.stringify(chosenPreset));
    }
    setScreen('tracker');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('fgr_token');
    sessionStorage.removeItem('fgr_user');
    sessionStorage.removeItem('fgr_preset');
    setUser(null);
    setReport(null);
    setPreset(DEFAULT_PRESET);
    setSessionExpired(false);
    setScreen('onboarding');
  };

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

  const handleNewSession  = () => { setReport(null); setScreen('tracker'); };
  const handleShowHistory = () => setScreen('history');
  const handleBackFromHistory = () => setScreen('tracker');

  return (
    <>
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
          preset={preset}
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