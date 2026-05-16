import { useState, useEffect } from 'react';
import Onboarding from './components/Onboarding.jsx';
import Tracker from './components/Tracker.jsx';
import SessionReport from './components/SessionReport.jsx';

export default function App() {
  const [screen, setScreen] = useState('onboarding'); // onboarding | tracker | report | history
  const [user, setUser] = useState(null);
  const [report, setReport] = useState(null);

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

    // 3. Token iniettato da Flutter DOPO il mount (caso normale WebView)
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
  };

  const handleProceed = () => {
    setScreen('tracker');
  };

  const handleReportReady = (reportData) => {
    setReport(reportData);

    // Se autenticato, salva sul backend
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
      }).catch(() => {}); // silent fail — report si mostra comunque
    }

    setScreen('report');
  };

  const handleNewSession = () => {
    setReport(null);
    setScreen('tracker');
  };

  const handleShowHistory = () => {
    setScreen('history');
  };

  const handleBackFromHistory = () => {
    setScreen('tracker');
  };

  return (
    <>
      {screen === 'onboarding' && (
        <Onboarding onProceed={handleProceed} onLogin={handleLogin} />
      )}
      {screen === 'tracker' && (
        <Tracker
          user={user}
          onReportReady={handleReportReady}
          onShowHistory={handleShowHistory}
        />
      )}
      {screen === 'report' && report && (
        <SessionReport
          report={report}
          user={user}
          initialTab="stats"
          onNewSession={handleNewSession}
          onShowHistory={handleShowHistory}
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
        />
      )}
    </>
  );
}