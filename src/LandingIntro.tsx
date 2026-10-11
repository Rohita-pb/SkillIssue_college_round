import { useEffect, useRef, useState } from 'react';
import './landing-intro.css';

type LandingIntroProps = { onSkip: () => void; onComplete: () => void };
const overlays = [
  { eyebrow: 'AI AGENT SECURITY', first: 'AI agents are powerful.', second: '', tone: 'neutral' },
  { eyebrow: 'CONNECTED CAPABILITIES', first: 'They can access tools,', second: 'data & memory.', tone: 'neutral' },
  { eyebrow: 'UNTRUSTED INGRESS', first: 'But what happens', second: 'when they go wrong?', tone: 'warning' },
  { eyebrow: 'AUTOMATED DEFENSE', first: 'Find the risks.', second: 'Validate the defenses.', tone: 'lime' },
];

/** The supplied Veo clip is only an illustrative intro, never test evidence. */
export default function LandingIntro({ onSkip, onComplete }: LandingIntroProps) {
  const video = useRef<HTMLVideoElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const callbacks = useRef({ onSkip, onComplete });
  callbacks.current = { onSkip, onComplete };
  const finished = useRef(false);
  const [time, setTime] = useState(0);
  const [fallback, setFallback] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const stage = overlays[Math.min(3, Math.floor(time / 2.15))];

  const finish = (kind: 'onSkip' | 'onComplete') => {
    if (finished.current) return;
    finished.current = true;
    video.current?.pause();
    callbacks.current[kind]();
  };

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    skip.current?.focus({ preventScroll: true });
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const dismiss = () => {
      if (finished.current) return;
      finished.current = true;
      callbacks.current.onSkip();
    };
    const motionChanged = () => { if (media.matches) dismiss(); };
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
      if (event.key === 'Tab') { event.preventDefault(); skip.current?.focus(); }
    };
    media.addEventListener('change', motionChanged);
    document.addEventListener('keydown', keys, true);
    motionChanged();
    let disposed = false;
    const player = video.current;
    if (player) {
      player.muted = true;
      void player.play().catch(() => { if (!disposed) setFallback(true); });
    }
    // A stalled/unsupported clip must not trap visitors behind the intro.
    let previousTime = -1;
    const watchdog = window.setInterval(() => {
      const currentTime = player?.currentTime ?? 0;
      if (currentTime === previousTime && !player?.ended) setFallback(true);
      previousTime = currentTime;
    }, 2500);
    const limit = window.setTimeout(() => setLeaving(true), 13000);
    return () => {
      disposed = true;
      player?.pause();
      clearInterval(watchdog);
      clearTimeout(limit);
      media.removeEventListener('change', motionChanged);
      document.removeEventListener('keydown', keys, true);
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!fallback) return;
    video.current?.pause();
    const timer = window.setTimeout(() => setLeaving(true), 1300);
    return () => clearTimeout(timer);
  }, [fallback]);
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => {
      if (!finished.current) { finished.current = true; callbacks.current.onComplete(); }
    }, 600);
    return () => clearTimeout(timer);
  }, [leaving]);

  return <section className={`veo-intro${leaving ? ' veo-leaving' : ''}`} role="dialog" aria-modal="true" aria-label="AgentBreak cinematic introduction" aria-describedby="veo-description">
    <video ref={video} className="veo-film" src="/agentbreak-veo-intro.mp4" poster="/agentbreak-intro-poster.png" autoPlay muted playsInline preload="auto" controls={false} disablePictureInPicture aria-hidden="true" tabIndex={-1}
      onTimeUpdate={event => setTime(event.currentTarget.currentTime)} onEnded={() => setLeaving(true)} onError={() => setFallback(true)} />
    <div className="veo-shade" aria-hidden="true" />
    <div className={`veo-caption veo-${stage.tone}`} key={stage.eyebrow}>
      <span>{fallback ? 'CONTROLLED SECURITY TESTING' : stage.eyebrow}</span>
      <h2>{fallback ? 'Explore your agent’s boundaries.' : <>{stage.first}{stage.second && <><br /><em>{stage.second}</em></>}</>}</h2>
    </div>
    <p id="veo-description" className="veo-disclaimer">Conceptual animation · not a live attack or verified result.</p>
    <button ref={skip} type="button" className="veo-skip" onClick={() => finish('onSkip')}>Skip intro <span aria-hidden="true">↗</span></button>
    <div className="veo-progress" aria-hidden="true"><span style={{ width: `${Math.min(100, time / 9.109313 * 100)}%` }} /></div>
  </section>;
}
