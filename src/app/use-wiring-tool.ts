import { useCallback, useRef, useState, type RefObject } from 'react';

import { connectControlWire } from '../application/construction/construction-attempt';
import {
  currentEditorAttempt,
  type EditorSession,
  type executeEditorCommand,
} from '../application/editor-session/editor-session';
import type { LevelDocument } from '../domain/level-document';

interface UseWiringToolOptions {
  readonly sessionRef: RefObject<EditorSession>;
  readonly executeCommand: (command: Parameters<typeof executeEditorCommand>[1]) => void;
  readonly setFeedback: (message: string | null) => void;
}

interface WiringTool {
  /** The lever waiting for its conveyor, or `null` when no link is being made. */
  readonly wiringSourceId: string | null;
  /** Same value, readable synchronously by the board's pointer handlers. */
  readonly wiringSourceRef: RefObject<string | null>;
  readonly startWiring: (sourceId: string) => void;
  readonly cancelWiring: () => void;
  /** The board was tapped while linking: `placementId` is what lies under the finger. */
  readonly completeWiring: (placementId: string | null) => void;
}

const nextWireId = (document: LevelDocument): string => {
  const used = new Set(document.wires.map(({ id }) => id));
  let index = 1;
  while (used.has(`wire-${String(index)}`)) index += 1;
  return `wire-${String(index)}`;
};

/**
 * ADR 0009: a link is made in two taps, with no drag and no hover — pick
 * "Relier à un convoyeur" on a selected lever, then touch the conveyor.
 * Touching empty board cancels; touching anything else asks again.
 */
export function useWiringTool({
  sessionRef,
  executeCommand,
  setFeedback,
}: UseWiringToolOptions): WiringTool {
  const [wiringSourceId, setWiringSourceId] = useState<string | null>(null);
  const wiringSourceRef = useRef<string | null>(null);

  const updateSource = useCallback((sourceId: string | null): void => {
    wiringSourceRef.current = sourceId;
    setWiringSourceId(sourceId);
  }, []);

  const startWiring = useCallback(
    (sourceId: string): void => {
      updateSource(sourceId);
      setFeedback(null);
    },
    [updateSource, setFeedback],
  );

  const cancelWiring = useCallback((): void => {
    updateSource(null);
  }, [updateSource]);

  const completeWiring = useCallback(
    (placementId: string | null): void => {
      const sourceId = wiringSourceRef.current;
      if (sourceId === null) return;
      if (placementId === null) {
        updateSource(null);
        return;
      }

      const session = sessionRef.current;
      const document = currentEditorAttempt(session).document;
      const target = document.objects.find(({ id }) => id === placementId);
      if (target?.type !== 'conveyor') {
        setFeedback('Touchez un convoyeur pour le relier au levier.');
        return;
      }

      executeCommand(
        connectControlWire({
          context: session.mode === 'resolution' ? 'player' : 'author',
          wireId: nextWireId(document),
          sourceId,
          targetId: target.id,
        }),
      );
      updateSource(null);
    },
    [sessionRef, executeCommand, setFeedback, updateSource],
  );

  return { wiringSourceId, wiringSourceRef, startWiring, cancelWiring, completeWiring };
}
