import { useCallback, useRef, useState, type RefObject } from 'react';

import { connectControlWire } from '../application/construction/construction-attempt';
import {
  currentEditorAttempt,
  type EditorSession,
  type executeEditorCommand,
} from '../application/editor-session/editor-session';
import {
  controlWireSourceIssue,
  controlWireTargetIssue,
  type LevelDocument,
} from '../domain/level-document';

type Placement = LevelDocument['objects'][number];

/** Where the "Fil" card's gesture stands: pick a controller, then its devices. */
export type WiringStep =
  | { readonly kind: 'source' }
  | {
      readonly kind: 'target';
      readonly sourceId: string;
      /** Wires made from this source during the gesture. */
      readonly linkedCount: number;
    };

type WiringTapOutcome =
  | { readonly kind: 'next'; readonly step: WiringStep }
  | { readonly kind: 'refused'; readonly message: string }
  | { readonly kind: 'connect'; readonly sourceId: string; readonly targetId: string };

/**
 * What a tap on `placementId` does at `step`. The rules and their wording
 * are the domain's (`controlWireSourceIssue`, `controlWireTargetIssue`); the
 * one-controller rule depends on the other wires and is left to the
 * `connectControlWire` command (`wire-already-connected`).
 */
export const wiringTap = (
  step: WiringStep,
  objects: readonly Pick<Placement, 'id' | 'type'>[],
  placementId: string,
): WiringTapOutcome => {
  const typeOf = (id: string): Placement['type'] | undefined =>
    objects.find((object) => object.id === id)?.type;
  const tapped = typeOf(placementId);

  if (step.kind === 'source') {
    const issue = controlWireSourceIssue(tapped);
    return issue === null
      ? { kind: 'next', step: { kind: 'target', sourceId: placementId, linkedCount: 0 } }
      : { kind: 'refused', message: issue };
  }

  const source = typeOf(step.sourceId);
  // An undo can take the source away mid-gesture: start over from it.
  if (controlWireSourceIssue(source) !== null) return { kind: 'next', step: { kind: 'source' } };
  const issue = controlWireTargetIssue(source, tapped);
  return issue === null
    ? { kind: 'connect', sourceId: step.sourceId, targetId: placementId }
    : { kind: 'refused', message: issue };
};

/** The guidance shown for `step`, and the label of the command that leaves the gesture. */
export const wiringGuide = (
  step: WiringStep,
): { readonly prompt: string; readonly exitLabel: string } => {
  if (step.kind === 'source') {
    return { prompt: 'Touchez un levier ou un bouton', exitLabel: 'Annuler le fil' };
  }
  return step.linkedCount === 0
    ? { prompt: 'Touchez l’appareil à commander', exitLabel: 'Annuler le fil' }
    : {
        prompt: 'Fil posé. Touchez un autre appareil à commander',
        exitLabel: 'Terminer les fils',
      };
};

const nextWireId = (document: LevelDocument): string => {
  const used = new Set(document.wires.map(({ id }) => id));
  let index = 1;
  while (used.has(`wire-${String(index)}`)) index += 1;
  return `wire-${String(index)}`;
};

interface UseWiringToolOptions {
  readonly sessionRef: RefObject<EditorSession>;
  readonly executeCommand: (
    command: Parameters<typeof executeEditorCommand>[1],
  ) => ReturnType<typeof executeEditorCommand>;
  readonly setFeedback: (message: string | null) => void;
  /** The chosen source is selected, so the board shows it and its circuit. */
  readonly onSourceChosen: (sourceId: string) => void;
}

interface WiringTool {
  /** The gesture in progress, or `null` when the "Fil" card is not active. */
  readonly wiringStep: WiringStep | null;
  /** Whether the gesture is active, readable synchronously by the board's pointer handlers. */
  readonly isWiringRef: RefObject<boolean>;
  readonly startWiring: () => void;
  readonly cancelWiring: () => void;
  /** A placement was touched while wiring. */
  readonly handleWiringTap: (placementId: string) => void;
}

/**
 * U15: the author's "Fil" card. Touch it, then a lever or a button, then each
 * device it should command; the tool stays on that source so one controller
 * commands several devices in a row, until "Terminer les fils". Every wire
 * goes through `connectControlWire`, so undo and redo cover it.
 */
export function useWiringTool({
  sessionRef,
  executeCommand,
  setFeedback,
  onSourceChosen,
}: UseWiringToolOptions): WiringTool {
  const [wiringStep, setWiringStep] = useState<WiringStep | null>(null);
  const stepRef = useRef<WiringStep | null>(null);
  const isWiringRef = useRef(false);

  const updateStep = useCallback((step: WiringStep | null): void => {
    stepRef.current = step;
    isWiringRef.current = step !== null;
    setWiringStep(step);
  }, []);

  const startWiring = useCallback((): void => {
    updateStep({ kind: 'source' });
    setFeedback(null);
  }, [updateStep, setFeedback]);

  const cancelWiring = useCallback((): void => {
    if (stepRef.current === null) return;
    updateStep(null);
    setFeedback(null);
  }, [updateStep, setFeedback]);

  const handleWiringTap = useCallback(
    (placementId: string): void => {
      const step = stepRef.current;
      if (step === null) return;
      const session = sessionRef.current;
      const { document } = currentEditorAttempt(session);
      const outcome = wiringTap(step, document.objects, placementId);

      if (outcome.kind === 'refused') {
        setFeedback(outcome.message);
        return;
      }
      if (outcome.kind === 'next') {
        updateStep(outcome.step);
        if (outcome.step.kind === 'target') onSourceChosen(outcome.step.sourceId);
        setFeedback(null);
        return;
      }

      const result = executeCommand(
        connectControlWire({
          context: session.mode === 'resolution' ? 'player' : 'author',
          wireId: nextWireId(document),
          sourceId: outcome.sourceId,
          targetId: outcome.targetId,
        }),
      );
      // A refusal is already reported by `executeCommand`; the gesture stays
      // on its source either way.
      if (result.status === 'accepted' && step.kind === 'target') {
        updateStep({ ...step, linkedCount: step.linkedCount + 1 });
        setFeedback(null);
      }
    },
    [sessionRef, executeCommand, setFeedback, updateStep, onSourceChosen],
  );

  return { wiringStep, isWiringRef, startWiring, cancelWiring, handleWiringTap };
}
