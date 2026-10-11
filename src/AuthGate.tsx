import { useEffect, useState, type ReactNode } from 'react';

export default function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [required, setRequired] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/auth/me').then(response => { setRequired(response.status === 401); setReady(response.ok); if (!response.ok && response.status !== 401) setError('The API is unavailable.'); }).catch(() => setError('The API is unavailable.'));
  }, []);
  if (ready) return <>{children}<button className="button secondary session-signout" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.reload(); }}>Sign out</button></>;
  return <main className="boot"><h1>AgentBreak</h1>{required ? <form className="auth-form" onSubmit={async event => {
    event.preventDefault(); setError('');
    try {
      const response = await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      if (!response.ok) throw new Error('The access token is invalid or expired.');
      setToken(''); setReady(true);
    } catch (error) { setError((error as Error).message); }
  }}><p>Enter the access token issued by your workspace administrator.</p><label htmlFor="access-token">Access token</label><input id="access-token" type="password" value={token} onChange={event => setToken(event.target.value)} autoComplete="off" required /><button className="button primary" type="submit">Open workspace</button></form> : <p>Connecting to your workspace…</p>}{error && <p role="alert">{error}</p>}</main>;
}
