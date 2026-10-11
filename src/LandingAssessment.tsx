import { useEffect, useId, useRef, useState } from 'react';
import { SURFACES, type Campaign, type Store, type Surface, type Target, type Trace } from '../shared/types';
import './landing-assessment.css';

export interface LandingAssessmentProps {
  open: boolean;
  onClose: () => void;
  initialSurface?: Surface;
}

const counts = (traces: Trace[]) => ({
  attempted: traces.length,
  violations: traces.filter(trace => trace.outcome === 'success').length,
  blocked: traces.filter(trace => trace.outcome === 'blocked').length,
  errors: traces.filter(trace => trace.outcome === 'error').length,
});
const message = (error: unknown) => error instanceof Error ? error.message : 'Request failed.';

async function responseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || `Request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export default function LandingAssessment({ open, onClose, initialSurface }: LandingAssessmentProps) {
  const titleId = useId();
  const noteId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const closeHandler = useRef(onClose);
  closeHandler.current = onClose;
  const mounted = useRef(false);
  const mutationLock = useRef(false);
  const mutationEpoch = useRef(0);
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetId, setTargetId] = useState('');
  const [surfaces, setSurfaces] = useState<Surface[]>(() => initialSurface ? [initialSurface] : SURFACES.map(surface => surface.id));
  const [budget, setBudget] = useState('10');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [busy, setBusy] = useState<'launch' | 'stop' | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [stopUncertain, setStopUncertain] = useState(false);
  const [readError, setReadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [selectedTrace, setSelectedTrace] = useState('');
  const running = campaign?.status === 'running';

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // A new entry point can choose a surface before launch, never alter a retained run.
  useEffect(() => {
    if (open && !campaign && !busy && !uncertain) {
      setSurfaces(initialSurface ? [initialSurface] : SURFACES.map(surface => surface.id));
    }
    // Reopening an unfinished form preserves its user selections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSurface]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeHandler.current(); }
      if (event.key !== 'Tab' || !dialog.current) return;
      const items = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]'))
        .filter(item => item.getClientRects().length > 0);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) { event.preventDefault(); dialog.current.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !dialog.current.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.current.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = oldOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = async () => {
      const epoch = mutationEpoch.current;
      setLoading(true);
      let continuePolling = running;
      try {
        const state = await responseJson<Store>(await fetch('/api/state', { signal: controller.signal, cache: 'no-store' }));
        if (disposed || epoch !== mutationEpoch.current) return;
        const synthetic = state.targets.filter(target => target.mode === 'simulation' && ['atlas', 'research', 'ledger'].includes(target.id));
        setTargets(synthetic);
        setTargetId(current => synthetic.some(target => target.id === current) ? current : synthetic[0]?.id || '');
        if (campaign) {
          const updated = state.campaigns.find(item => item.id === campaign.id);
          if (!updated) throw new Error('This campaign is missing from the server state. Retained evidence is shown below.');
          setCampaign(updated);
          setTraces(state.traces.filter(trace => trace.campaignId === updated.id && !trace.replayOf));
          setStopUncertain(false);
          continuePolling = updated.status === 'running';
        }
        setReadError('');
      } catch (error) {
        if (!disposed && !controller.signal.aborted) setReadError(message(error));
      } finally {
        if (!disposed) {
          setLoading(false);
          if (continuePolling) timer = setTimeout(() => void read(), 800);
        }
      }
    };
    void read();
    return () => { disposed = true; controller.abort(); clearTimeout(timer); };
    // A serial polling loop reads by campaign ID; status transitions restart/stop it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaign?.id, running, refresh]);

  const launch = async () => {
    const attempts = Number(budget);
    if (mutationLock.current || campaign || uncertain || !targetId || !surfaces.length || !Number.isInteger(attempts) || attempts < 5 || attempts > 100) return;
    mutationLock.current = true;
    mutationEpoch.current++;
    setBusy('launch');
    setActionError('');
    let rejected = false;
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Landing security assessment', targetId, surfaces, budget: attempts, seed: 2026 }),
      });
      rejected = response.status >= 400 && response.status < 500;
      const created = await responseJson<Campaign>(response);
      if (mounted.current) { setCampaign(created); setTraces([]); setSelectedTrace(''); }
    } catch (error) {
      if (mounted.current) {
        setUncertain(!rejected);
        setActionError(rejected ? message(error) : `${message(error)} Launch outcome is unknown; the backend may be running. Check the workbench before starting another assessment. This request will not be retried automatically.`);
      }
    } finally {
      mutationEpoch.current++;
      mutationLock.current = false;
      if (mounted.current) { setBusy(null); setRefresh(value => value + 1); }
    }
  };

  const stop = async () => {
    if (mutationLock.current || !campaign || !running || stopUncertain) return;
    mutationLock.current = true;
    mutationEpoch.current++;
    setBusy('stop');
    setActionError('');
    try {
      const stopped = await responseJson<Campaign>(await fetch(`/api/campaigns/${encodeURIComponent(campaign.id)}/stop`, { method: 'POST' }));
      if (mounted.current) setCampaign(stopped);
    } catch (error) {
      if (mounted.current) {
        setStopUncertain(true);
        setActionError(`${message(error)} Stop was not confirmed. Refresh the state before deciding whether to stop again; no automatic retry was made.`);
      }
    } finally {
      mutationEpoch.current++;
      mutationLock.current = false;
      if (mounted.current) { setBusy(null); setRefresh(value => value + 1); }
    }
  };

  const reset = () => {
    if (running || mutationLock.current) return;
    setCampaign(null); setTraces([]); setSelectedTrace(''); setUncertain(false); setStopUncertain(false);
    setActionError(''); setReadError(''); setBudget('10');
    setSurfaces(initialSurface ? [initialSurface] : SURFACES.map(surface => surface.id));
    setRefresh(value => value + 1);
  };

  if (!open) return null;
  const selectedTarget = targets.find(target => target.id === targetId);
  const totals = counts(traces);
  const trace = traces.find(item => item.id === selectedTrace);
  const validBudget = Number.isInteger(Number(budget)) && Number(budget) >= 5 && Number(budget) <= 100;
  const locked = !!campaign || !!busy || uncertain;

  return <div className="la-backdrop">
    <div className="la-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={noteId} tabIndex={-1}>
      <button className="la-close" type="button" ref={closeButton} onClick={onClose} aria-label="Close assessment">×</button>
      <header className="la-header">
        <p className="la-eyebrow">Autonomous probe suite</p>
        <h2 id={titleId}>AgentBreak Security Assessment</h2>
        <p id={noteId}>Synthetic simulation. Tool effects stay in memory: no real accounts or external network calls.</p>
      </header>

      {readError && <div className="la-notice" role="alert"><p>Unable to refresh: {readError} Existing evidence is retained.</p><button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading}>Retry refresh</button></div>}
      {actionError && <div className="la-notice" role="alert"><p>{actionError}</p><a href="/?start=test">Inspect the workbench</a></div>}

      {!campaign && <>
        <fieldset className="la-fieldset" disabled={locked}>
          <legend>01 / Target AI Agent Architecture</legend>
          <div className="la-targets">
            {targets.map(target => <label key={target.id} className={`la-target ${targetId === target.id ? 'is-selected' : ''}`}>
              <input type="radio" name={`${titleId}-target`} value={target.id} checked={targetId === target.id} onChange={() => setTargetId(target.id)} />
              <span className="la-target-name">{target.name}</span><span>{target.description}</span><small>Simulation</small>
            </label>)}
          </div>
          {!targets.length && <><p className="la-muted" role="status">{loading ? 'Loading synthetic architectures…' : 'No supported simulation targets available. Refresh to try again.'}</p><button type="button" className="la-secondary" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh targets</button></>}
        </fieldset>
        <fieldset className="la-fieldset" disabled={locked}>
          <legend>02 / Select attack scenarios</legend>
          <div className="la-scenarios">{SURFACES.map(surface => <label className="la-scenario" key={surface.id}>
            <input type="checkbox" checked={surfaces.includes(surface.id)} onChange={event => setSurfaces(current => event.target.checked ? [...current, surface.id] : current.filter(item => item !== surface.id))} />
            <span><strong>{surface.label}</strong><small>{surface.description}</small></span>
          </label>)}</div>
        </fieldset>
        <fieldset className="la-fieldset la-budget" disabled={locked}>
          <legend>03 / Assessment budget</legend>
          <label>Attempts <input type="number" min={5} max={100} step={1} value={budget} onChange={event => setBudget(event.target.value)} aria-invalid={!validBudget} /></label>
          <span>5–100 attempts · Fixed seed 2026</span>
        </fieldset>
        <div className="la-review"><strong>Review assessment</strong><p>{selectedTarget?.name || 'Choose a target'} · {surfaces.length} scenarios · {validBudget ? budget : '5–100'} attempts · seed 2026</p><p>Uses the target’s current defenses. Attempts are allocated adaptively across selected scenarios.</p></div>
        <button type="button" className="la-primary" onClick={() => void launch()} disabled={locked || !selectedTarget || !surfaces.length || !validBudget || !!readError}>{busy === 'launch' ? 'Launching assessment…' : 'Launch Assessment ↗'}</button>
        {uncertain && <button type="button" className="la-secondary" onClick={reset}>New assessment (a previous launch may still run)</button>}
      </>}

      {campaign && <section className="la-results" aria-label="Assessment evidence">
        <div className="la-run-heading"><div><p className="la-eyebrow">{campaign.status}</p><h3>{campaign.targetSnapshot.name}</h3></div><span className="la-mono">Seed {campaign.seed}</span></div>
        <p role="status" aria-live="polite">{campaign.completed} / {campaign.budget} attempts completed · {campaign.status}</p>
        <progress aria-label="Completed assessment attempts" value={campaign.completed} max={campaign.budget} />
        <div className="la-totals"><div><strong>{totals.violations}</strong><span>Violations</span></div><div><strong>{totals.blocked}</strong><span>Blocked / no violation</span></div><div><strong>{totals.errors}</strong><span>Errors</span></div></div>
        {traces.length !== campaign.completed && <p className="la-muted">Showing counts from {traces.length} received traces; the backend reports {campaign.completed} completed attempts. Refresh evidence to reconcile.</p>}
        <p className="la-evidence-note">These are original engine policy-violation outcomes for synthetic fixtures, not results from the platform’s independent verifier. A blocked outcome means no violation was observed in that attempt, not that the architecture is secure.</p>
        <ul className="la-surface-results">{campaign.surfaces.map(surfaceId => {
          const surface = SURFACES.find(item => item.id === surfaceId);
          const result = counts(traces.filter(item => item.input.surface === surfaceId));
          return <li key={surfaceId}><strong>{surface?.label || surfaceId}</strong><span>{result.attempted ? `${result.attempted} attempted · ${result.violations} violations · ${result.blocked} blocked / no violation · ${result.errors} errors` : running ? 'Waiting for an attempt' : 'Not attempted'}</span></li>;
        })}</ul>
        <div className="la-evidence-header"><h3>Attempt traces <span>({traces.length})</span></h3><button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh evidence</button></div>
        {!traces.length && <p className="la-muted">No completed attempt traces received yet.</p>}
        <div className="la-traces">{traces.map((item, index) => <button key={item.id} className={selectedTrace === item.id ? 'is-selected' : ''} type="button" aria-expanded={selectedTrace === item.id} aria-controls={`${titleId}-trace`} onClick={() => setSelectedTrace(current => current === item.id ? '' : item.id)}><span>{String(index + 1).padStart(2, '0')} / {item.title}</span><small>{item.outcome === 'success' ? 'Violation' : item.outcome === 'blocked' ? 'Blocked / no violation' : 'Error'}</small></button>)}</div>
        {trace && <article className="la-trace-detail" id={`${titleId}-trace`}><h4>{trace.title}</h4><p className="la-mono">{trace.id} · {trace.durationMs} ms · {trace.severity}</p><p>{trace.input.objective}</p><h5>Exact payload</h5><pre>{trace.input.payload}</pre><h5>Execution steps & tool results</h5>{trace.steps.map(step => <details key={step.id} open={step.kind === 'tool' || step.kind === 'result'}><summary>{step.id}. {step.label} · {step.status}</summary>{step.tool && <p className="la-mono">Tool: {step.tool}</p>}{step.args && <pre>{JSON.stringify(step.args, null, 2)}</pre>}<pre>{step.content}</pre></details>)}<a href={`/api/traces/${encodeURIComponent(trace.id)}/export`} download>Download exact trace JSON ↗</a></article>}
        <div className="la-actions">{running ? <button type="button" className="la-secondary" disabled={!!busy || stopUncertain} onClick={() => void stop()}>{busy === 'stop' ? 'Stopping…' : 'Stop assessment'}</button> : <button type="button" className="la-primary" disabled={!!busy} onClick={reset}>New assessment</button>}</div>
      </section>}
      <footer className="la-footer"><p>{running || busy === 'launch' || uncertain ? 'Closing this modal does not stop the backend assessment. Reopen here to see a confirmed run’s progress.' : 'Evidence is retained while this component stays mounted. New assessment explicitly clears this view.'}</p><a href="/?start=test">Open full workbench ↗</a></footer>
    </div>
  </div>;
}
