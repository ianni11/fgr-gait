import { useState, useEffect } from 'react';
import Onboarding from './Onboarding.jsx';
import Tracker from './Tracker.jsx';
import SessionReport from './SessionReport.jsx';

export default function App() {
  const [screen, setScreen] = useState('onboarding'); // onboarding | tracker | report
  const [user, setUser] = useState(null);
  const [report, setReport] = useState(null);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const token = sessionStorage.getItem('fgr_token');
    const userStr = sessionStorage.getItem('fgr_user');
    if (token && userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {}
    }
    // Check if Flutter injected token
    if (window.fgrToken) {
      sessionStorage.setItem('fgr_token', window.fgrToken);
      setUser({ username: window.fgrUsername || 'atleta' });
    }
  }, []);

  const handleLogin = (token, userData) => {
    setUser(userData);
  };

  const handleProceed = () => {
    setScreen('tracker');
  };

  const handleReportReady = (reportData) => {
    setReport(reportData);

    // If authenticated, save to backend
    const token = sessionStorage.getItem('fgr_token');
    if (token) {
      fetch(`${import.meta.env.VITE_API_BASE}/save_gait_session.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          score: reportData.score,
          sample_count: reportData.sampleCount,
          duration_seconds: reportData.durationSeconds,
          session_stats: reportData.stats,
          timeline: reportData.timeline,
          generated_at: reportData.generatedAt,
        }),
      }).catch(() => {}); // silent fail — report still shows
    }

    setScreen('report');
  };

  const handleNewSession = () => {
    setReport(null);
    setScreen('tracker');
  };

  return (
    <>
      {screen === 'onboarding' && (
        <Onboarding onProceed={handleProceed} onLogin={handleLogin} />
      )}
      {screen === 'tracker' && (
        <Tracker user={user} onReportReady={handleReportReady} />
      )}
      {screen === 'report' && report && (
        <SessionReport report={report} user={user} onNewSession={handleNewSession} />
      )}
    </>
  );
}
