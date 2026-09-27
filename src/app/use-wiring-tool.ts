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

/**
 * The step after a wire is laid: the gesture stays on its source, unless the
 * player has no wire left (U21). `wiresLeft` is `null` for the author, whose
 * wires come from no inventory.
 */
export const wiringStepAfterWire = (
  step: Extract<WiringStep, { kind: 'target' }>,
  wiresLeft: number | null,
): WiringStep | null => (wiresLeft === 0 ? null : { ...step, linkedCount: step.linkedCount + 1 });

/** Wire ids stay apart from object ids: an attempt's provenance keys both (U21). */
const nextWireId = (document: LevelDocument): string => {
  const used = new Set([...document.wires, ...document.objects].map(({ id }) => id));
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
  /** The player's last wire is laid and the gesture has ended (U21). */
  readonly onWiresExhausted: () => void;
}

interface WiringTool {
  /** The gesture in progress, or `null` when the "Fil" card is not active. */
  readonly wiringStep: WiringStep | null;
  /** Whether the gesture is active, readable synchronously by the board's pointer handlers. */
  readonly isWiringRef: RefObject<boolean>;
  /** Starts the gesture; the player names the inventory entry his wires come from (U21). */
  readonly startWiring: (inventoryEntryId?: string) => void;
  readonly cancelWiring: () => void;
  /** A placement was touched while wiring. */
  readonly handleWiringTap: (placementId: string) => void;
}

/**
 * U15: the "Fil" card. Touch it, then a lever or a button, then each device
 * it should command; the tool stays on that source so one controller
 * commands several devices in a row, until "Terminer les fils". Every wire
 * goes through `connectControlWire`, so undo and redo cover it. U21: the
 * player's card takes each wire from an inventory entry, and the gesture
 * ends when that entry runs out.
 */
export function useWiringTool({
  sessionRef,
  executeCommand,
  setFeedback,
  onSourceChosen,
  onWiresExhausted,
}: UseWiringToolOptions): WiringTool {
  const [wiringStep, setWiringStep] = useState<WiringStep | null>(null);
  const stepRef = useRef<WiringStep | null>(null);
  const isWiringRef = useRef(false);
  const inventoryEntryIdRef = useRef<string | undefined>(undefined);

  const updateStep = useCallback((step: WiringStep | null): void => {
    stepRef.current = step;
    isWiringRef.current = step !== null;
    setWiringStep(step);
  }, []);

  const startWiring = useCallback(
    (inventoryEntryId?: string): void => {
      inventoryEntryIdRef.current = inventoryEntryId;
      updateStep({ kind: 'source' });
      setFeedback(null);
    },
    [updateStep, setFeedback],
  );

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

      const inventoryEntryId = inventoryEntryIdRef.current;
      const result = executeCommand(
        connectControlWire({
          context: session.mode === 'resolution' ? 'player' : 'author',
          wireId: nextWireId(document),
          sourceId: outcome.sourceId,
          targetId: outcome.targetId,
          inventoryEntryId,
        }),
      );
      // A refusal is already reported by `executeCommand`; the gesture stays
      // on its source either way.
      if (result.status === 'accepted' && step.kind === 'target') {
        const wiresLeft =
          session.mode === 'resolution'
            ? (currentEditorAttempt(result.session).document.inventory.find(
                ({ id }) => id === inventoryEntryId,
              )?.quantity ?? 0)
            : null;
        const next = wiringStepAfterWire(step, wiresLeft);
        updateStep(next);
        setFeedback(next === null ? 'Fil posé. Il ne reste plus de fil.' : null);
        if (next === null) onWiresExhausted();
      }
    },
    [sessionRef, executeCommand, setFeedback, updateStep, onSourceChosen, onWiresExhausted],
  );

  return { wiringStep, isWiringRef, startWiring, cancelWiring, handleWiringTap };
}
