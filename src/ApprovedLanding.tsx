import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowRight, Box, Cpu, Database, LockKeyhole, Network } from 'lucide-react';
import type { Surface, Trace } from '../shared/types';
import AssessmentModal from './LandingAssessment';
import './approved-landing.css';

const scenarios: { surface: Surface; title: string; description: string }[] = [
  { surface: 'retrieval', title: 'Indirect Tool Poisoning', description: 'Explore instructions hidden in retrieved content before they reach a modeled tool.' },
  { surface: 'memory', title: 'Memory Store Poisoning', description: 'Inspect attempts to turn persistent context into unauthorized instructions.' },
  { surface: 'multi-stage', title: 'Secondary API Privilege Escalation', description: 'Follow chained attempts across retrieval, memory, and modeled tool boundaries.' },
];

const components = [
  { icon: Cpu, title: 'AI Agent Core', description: 'Continuously probe prompt injection, jailbreaks, persona inversion, and goal hijacking.' },
  { icon: Network, title: 'External Tools & APIs', description: 'Validate argument boundaries, least-privilege scoping, and modeled outbound actions.' },
  { icon: Database, title: 'Memory Stores & RAG', description: 'Quarantine poisoned retrieval and detect persistent prompt backdoors in context.' },
  { icon: LockKeyhole, title: 'Sensitive Data Nodes', description: 'Test synthetic records, credentials, and outbound-data boundaries without real effects.' },
];

const outcomeLabels = {
  success: 'Policy violation observed',
  blocked: 'No violation observed',
  error: 'Inconclusive execution error',
};

// A fixed projection of a triangulated sphere: illustration only, with no runtime data.
function spherePoint(latitude: number, longitude: number) {
  const x = Math.cos(latitude) * Math.cos(longitude);
  const y = Math.sin(latitude);
  const z = Math.cos(latitude) * Math.sin(longitude);
  return [280 + (x * .92 + z * .39) * 172, 255 + (y * .93 - z * .32 + x * .13) * 172];
}

const sphereMesh = Array.from({ length: 12 }, (_, row) => {
  const latitude = -Math.PI / 2 + row * Math.PI / 12;
  return Array.from({ length: 22 }, (_, column) => {
    const longitude = column * Math.PI * 2 / 22;
    const a = spherePoint(latitude, longitude);
    const b = spherePoint(latitude + Math.PI / 12, longitude);
    const c = spherePoint(latitude + Math.PI / 12, longitude + Math.PI * 2 / 22);
    return `M${a.join(',')}L${b.join(',')}L${c.join(',')}Z`;
  }).join(' ');
}).join(' ');

function AgentSphere() {
  return <figure className="al-sphere">
    <svg viewBox="0 0 560 510" aria-hidden="true" focusable="false">
      <g className="al-orbits" fill="none" stroke="currentColor" strokeWidth=".7">
        <ellipse cx="280" cy="255" rx="254" ry="79" transform="rotate(-24 280 255)" />
        <ellipse cx="280" cy="255" rx="233" ry="110" transform="rotate(44 280 255)" />
        <ellipse cx="280" cy="255" rx="232" ry="91" transform="rotate(103 280 255)" />
      </g>
      <path d={sphereMesh} fill="none" stroke="currentColor" strokeWidth=".65" className="al-mesh" />
      <g fill="currentColor"><circle cx="66" cy="342" r="3" /><circle cx="452" cy="402" r="3" /><circle cx="239" cy="43" r="2.5" /></g>
      <g className="al-sphere-cross" stroke="currentColor" strokeWidth=".6"><path d="M272 255h16M280 247v16M21 255h14M525 255h14" /></g>
    </svg>
    <figcaption>AGENT BOUNDARIES / CONCEPTUAL VIEW</figcaption>
  </figure>;
}

function isSimulationTrace(value: unknown): value is Trace {
  if (!value || typeof value !== 'object') return false;
  const trace = value as Partial<Trace>;
  return trace.targetSnapshot?.mode === 'simulation'
    && typeof trace.id === 'string' && typeof trace.createdAt === 'string'
    && typeof trace.input?.payload === 'string' && typeof trace.input.surface === 'string'
    && (trace.outcome === 'success' || trace.outcome === 'blocked' || trace.outcome === 'error')
    && Array.isArray(trace.steps) && trace.steps.every(step => step && typeof step.label === 'string' && typeof step.content === 'string');
}

export default function ApprovedLanding({ intro }: { intro?: ReactNode }) {
  const [surface, setSurface] = useState<Surface>('retrieval');
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentSurface, setAssessmentSurface] = useState<Surface>();
  const [traces, setTraces] = useState<Trace[]>([]);
  const [request, setRequest] = useState(0);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    setLoadState('loading');
    fetch('/api/state', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load stored traces');
        const state: unknown = await response.json();
        if (!state || typeof state !== 'object' || !('traces' in state) || !Array.isArray(state.traces)) throw new Error('Invalid trace response');
        if (controller.signal.aborted) return;
        setTraces(state.traces.filter(isSimulationTrace).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
        setLoadState('ready');
      })
      .catch(() => { if (!controller.signal.aborted) setLoadState('error'); });
    return () => controller.abort();
  }, [request]);

  const trace = traces.find(item => item.input.surface === surface);
  const selected = scenarios.find(item => item.surface === surface)!;

  return <div className={`approved-landing${intro ? ' al-introducing' : ''}`}>
    <a className="al-skip" href="#platform">Skip to content</a>
    <header className="al-header" inert={!!intro}>
      <div className="al-nav-wrap">
        <a className="al-brand" href="/landing" aria-label="AgentBreak home"><Box size={23} strokeWidth={1.6} />AGENTBREAK</a>
         <nav aria-label="Landing navigation">
           <a href="#platform">Platform</a>
           <a href="#connected-nodes">Connected Nodes</a>
           <a href="/" aria-label="Dashboard">Dashboard</a>
           <a href="#attack-vectors">Attack Vectors</a>
           <button type="button" onClick={() => { setAssessmentSurface(undefined); setAssessmentOpen(true); }}>Security Assessment</button>
        </nav>
        <a href="/?start=test" className="al-button al-nav-cta">Start testing <ArrowRight size={15} /></a>
      </div>
    </header>
    {intro}
    <main className="al-main" inert={!!intro}>
      <section className="al-hero al-container" id="platform" aria-labelledby="al-title">
        <div className="al-hero-copy">
          <p className="al-eyebrow"><span /> SECURITY FOR AGENTIC SYSTEMS</p>
          <h1 id="al-title">Your AI agent can take action.<br /><span>Make sure it acts safely.</span></h1>
          <p className="al-description">Explore how an agent responds when instructions, tools, and memory are put under pressure. Run controlled synthetic tests and inspect the behavior they record.</p>
          <div className="al-actions">
            <a href="/?start=test" className="al-button">Start Security Testing <ArrowRight size={17} /></a>
            <a href="#connected-nodes" className="al-text-link">Explore architecture <ArrowDown size={15} /></a>
          </div>
          <p className="al-hero-note">Synthetic environment. Observable traces. Optional model adapter.</p>
        </div>
        <AgentSphere />
      </section>

      <section className="al-section al-container" id="connected-nodes" aria-labelledby="al-components-title">
        <span id="how-it-works" className="al-anchor" />
        <p className="al-eyebrow">DEFEND EVERY COMPONENT</p>
        <h2 id="al-components-title">Test behavior across every tool,<br className="al-desktop-break" /> API, and memory boundary.</h2>
        <div className="al-component-grid">
          {components.map(({ icon: Icon, title, description }, index) => <article className="al-component" key={title}>
            <div className="al-component-top"><Icon size={27} strokeWidth={1.3} /><span>0{index + 1}</span></div>
            <h3>{title}</h3><p>{description}</p>
          </article>)}
        </div>
      </section>

      <section className="al-section al-container" id="attack-vectors" aria-labelledby="al-workbench-title">
         <p className="al-eyebrow">INTERACTIVE ATTACK WORKBENCH</p>
         <h2 id="al-workbench-title">Simulate how AgentBreak intercepts<br className="al-desktop-break" /> untrusted requests.</h2>
        <div className="al-workbench">
          <div className="al-scenarios">
            <p className="al-description">Choose a boundary to inspect its latest stored simulation trace. These are recorded test results, not a live production connection.</p>
            <div className="al-scenario-list" aria-label="Attack scenario">
              {scenarios.map((scenario, index) => <button key={scenario.surface} type="button" aria-pressed={surface === scenario.surface} aria-controls="al-evidence" onClick={() => setSurface(scenario.surface)}>
                <span className="al-scenario-number">0{index + 1}</span><span><strong>{scenario.title}</strong><small>{scenario.description}</small></span><ArrowRight size={17} />
              </button>)}
            </div>
             <button type="button" className="al-button" onClick={() => { setAssessmentSurface(surface); setAssessmentOpen(true); }}>Launch Custom Test <ArrowRight size={17} /></button>
          </div>
          <div className="al-evidence" id="al-evidence" role="region" aria-label={`${selected.title} evidence`} aria-busy={loadState === 'loading'}>
            <div className="al-console-bar"><span><span className="al-console-dot" /> STORED TRACE / SIMULATION</span><button type="button" disabled={loadState === 'loading'} onClick={() => setRequest(value => value + 1)} aria-label="Refresh stored traces">Refresh ↻</button></div>
            <div className="al-console-body" aria-live="polite">
              {loadState === 'loading' && <div className="al-console-state"><span>READING STORED EVIDENCE</span><p>Loading simulation traces…</p></div>}
              {loadState === 'error' && <div className="al-console-state"><span>EVIDENCE UNAVAILABLE</span><p>Stored traces could not be loaded. Check the API connection and try again.</p><button type="button" className="al-outline-button" onClick={() => setRequest(value => value + 1)}>Retry loading traces</button></div>}
              {loadState === 'ready' && !trace && <div className="al-console-state"><span>NO STORED TRACE</span><p>No simulation trace is available for {selected.title.toLowerCase()} yet.</p><p>Launch a custom test to generate evidence, then refresh this preview.</p></div>}
              {loadState === 'ready' && trace && <>
                <dl className="al-trace-meta"><div><dt>trace</dt><dd>{trace.id}</dd></div><div><dt>mode</dt><dd>{trace.targetSnapshot.mode}</dd></div><div><dt>surface</dt><dd>{trace.input.surface}</dd></div><div><dt>recorded</dt><dd>{trace.createdAt}</dd></div><div><dt>outcome</dt><dd className={`al-outcome-${trace.outcome}`}>{outcomeLabels[trace.outcome]}</dd></div></dl>
                <div className="al-evidence-label">INPUT / ACTUAL STORED PAYLOAD</div>
                <pre className="al-payload">{trace.input.payload}</pre>
                <div className="al-evidence-label">STEPS / FIRST {Math.min(3, trace.steps.length)} OF {trace.steps.length}</div>
                {trace.steps.length === 0 && <p>No steps were recorded for this trace.</p>}
                <ol className="al-trace-steps">{trace.steps.slice(0, 3).map((step, index) => <li key={`${step.id}-${index}`}><strong>{String(index + 1).padStart(2, '0')} / {step.label}</strong><pre>{step.content}</pre></li>)}</ol>
              </>}
            </div>
            <p className="al-evidence-note">Campaign-reported outcome for a synthetic simulation. This preview is not independent verification.</p>
          </div>
        </div>
      </section>

      <section className="al-final al-container" aria-labelledby="al-final-title"><p className="al-eyebrow">PUT YOUR BOUNDARIES TO THE TEST</p><h2 id="al-final-title">Ready to secure your<br /> autonomous AI agents?</h2><p>Start with a controlled test. Inspect the trace.<br />Use what you observe to improve your agent’s defenses.</p><a href="/?start=test" className="al-button">Start Security Testing <ArrowRight size={17} /></a></section>
    </main>
    <footer className="al-footer al-container" inert={!!intro}><a className="al-brand" href="/landing"><Box size={20} strokeWidth={1.6} />AGENTBREAK</a><nav aria-label="Footer navigation"><a href="#connected-nodes">Architecture</a><button type="button" onClick={() => setAssessmentOpen(true)}>Assessment</button></nav></footer>
    <AssessmentModal open={assessmentOpen} onClose={() => { setAssessmentOpen(false); setRequest(value => value + 1); }} initialSurface={assessmentSurface} />
  </div>;
}
