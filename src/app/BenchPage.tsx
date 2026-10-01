import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { createSimulationSession } from '../simulation/simulation-session';
import { AppFrame } from '../ui/AppFrame';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { benchVerdict, summarizeDurations, type DurationSummary } from './bench/bench-statistics';
import { denseBenchDocument } from './bench/dense-bench-document';

const FIXED_STEP_SECONDS = 1 / 60;
/** Twenty simulated seconds: the whole attempt budget. */
const MEASURED_STEPS = 1_200;

const milliseconds = (value: number): string => `${value.toFixed(2).replace('.', ',')} ms`;

/** What the measure needs of a simulation session. */
interface SteppedSession {
  readonly advanceFixedSteps: (count: number) => void;
  readonly destroy: () => void;
}

const createDenseSession = (): SteppedSession =>
  createSimulationSession(denseBenchDocument, { fixedStepSeconds: FIXED_STEP_SECONDS });

/** Physics alone, one fixed step at a time, timed by the injected clock. */
const measurePhysics = (
  now: () => number,
  createSession: () => SteppedSession,
): DurationSummary => {
  const session = createSession();
  const durations: number[] = [];
  try {
    for (let step = 0; step < MEASURED_STEPS; step += 1) {
      const start = now();
      session.advanceFixedSteps(1);
      durations.push(now() - start);
    }
  } finally {
    session.destroy();
  }
  return summarizeDurations(durations);
};

interface BenchPageProps {
  /** Wall clock in milliseconds; the app reads it here, never inside `src/simulation/`. */
  readonly now?: () => number;
  /** Injected for tests; defaults to the dense scene's real simulation. */
  readonly createSession?: () => SteppedSession;
}

/**
 * `/bench`: the phone gate of ADR 0002, reachable by URL only. It times the
 * physics of the densest provisional scene, then offers to play that scene on
 * the real board with a frame-rate meter (`/bench/play`).
 */
export function BenchPage({
  now = () => performance.now(),
  createSession = createDenseSession,
}: BenchPageProps) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DurationSummary | null>(null);

  return (
    <AppFrame title="Mesure de performance" subtitle="Scène dense, ADR 0002" variant="page">
      <div className="page-content">
        <Panel label="Mesure de performance" title="Tenir 60 images par seconde ?">
          <p className="panel-note">
            Une scène de 31 corps en mouvement et 6 articulations, la plus chargée qu’un niveau
            puisse contenir. Mesurez d’abord la physique seule, puis jouez la scène sur le plateau.
          </p>
          <Button
            tone="go"
            onClick={() => {
              setSummary(measurePhysics(now, createSession));
            }}
          >
            Mesurer la physique
          </Button>
          <Button
            onClick={() => {
              void navigate('/bench/play');
            }}
          >
            Jouer la scène sur le plateau
          </Button>
        </Panel>
        {summary !== null && (
          <Panel label="Résultat de la mesure" title="Résultat">
            <p>
              {summary.count} pas simulés — médiane : {milliseconds(summary.median)}, 95e centile :{' '}
              {milliseconds(summary.p95)}, pire cas : {milliseconds(summary.max)}.
            </p>
            <p>
              <strong>
                {benchVerdict({ framesPerSecond: null, physicsP95Milliseconds: summary.p95 }) ===
                'ok'
                  ? 'Physique : OK'
                  : 'Physique : à revoir'}
              </strong>
            </p>
            <p className="panel-note">
              OK si le 95e centile reste sous 8 ms par pas. Sur le plateau, viser au moins 55 images
              par seconde pendant toute la chute.
            </p>
          </Panel>
        )}
      </div>
    </AppFrame>
  );
}
