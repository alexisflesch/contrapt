import { useCallback, useRef, useState, type RefObject } from 'react';

import { createConstructionAttempt } from '../application/construction/construction-attempt';
import {
  createEditorSession,
  currentEditorAttempt,
  executeEditorCommand,
  redoEditorCommand,
  selectEditorPlacement,
  undoEditorCommand,
  type EditorSession,
} from '../application/editor-session/editor-session';
import { embeddedLevels, embeddedWorkshopDocument } from '../content/embedded-levels';
import type { LevelDocument } from '../domain/level-document';

/**
 * B1 (plan-remise-en-jeu.md § 4): the app opens directly on level 1 in
 * resolution mode, not the free-creation workshop. The workshop remains
 * reachable from the ☰ menu (`App.tsx`'s `loadWorkshop`). The fallback to the
 * workshop below only matters if `embeddedLevels` were ever empty, which
 * `embedded-levels.ts` structurally never allows — `noUncheckedIndexedAccess`
 * still requires handling it explicitly rather than asserting it away.
 */
const initialSession = (): EditorSession => {
  const levelOne = embeddedLevels[0];
  return levelOne === undefined
    ? createEditorSession('creation', createConstructionAttempt(embeddedWorkshopDocument))
    : createEditorSession('resolution', createConstructionAttempt(levelOne));
};

/** Translates an `EditorActionResult` rejection reason into user-facing feedback. */
const refusalMessage = (reason: string): string =>
  reason === 'outside-build-zone'
    ? 'Placement refusé : choisissez une position dans la zone de construction.'
    : 'Placement refusé : cette action est indisponible.';

interface EditorSessionController {
  readonly session: EditorSession;
  /** Always in sync with `session`, but updated synchronously: for gesture handlers that need the latest value within a single event. */
  readonly sessionRef: RefObject<EditorSession>;
  readonly feedback: string | null;
  readonly setFeedback: (message: string | null) => void;
  /** Sets `feedback` from an `EditorActionResult`/`EditorTransitionResult` rejection reason. */
  readonly reportRefusal: (reason: string) => void;
  readonly updateSession: (next: EditorSession) => void;
  readonly currentScene: () => LevelDocument['scene'];
  readonly undo: () => void;
  readonly redo: () => void;
  readonly selectPlacement: (placementId: string) => void;
  readonly executeCommand: (command: Parameters<typeof executeEditorCommand>[1]) => void;
}

/**
 * Owns the `EditorSession` (state, commands, undo/redo history) and the
 * refusal feedback shown to the user when a command or manipulation is
 * rejected. Manipulation lifecycle (begin/preview/commit/cancel) stays with
 * the pointer gestures that drive it (`use-board-pointers.ts`); this hook
 * exposes `sessionRef` and `updateSession` so those gestures can read and
 * write the session without owning it.
 */
export function useEditorSession(): EditorSessionController {
  const [session, setSession] = useState<EditorSession>(initialSession);
  const [feedback, setFeedback] = useState<string | null>(null);
  const sessionRef = useRef(session);

  // Wrapped in `useCallback` (with only ref/setState-setter dependencies, both
  // stable) so every function this hook returns keeps its identity across
  // renders. `sessionRef`/`setFeedback` are already stable on their own. This
  // lets consumers (this hook's own callbacks, and effects in other hooks
  // that read the latest session via `sessionRef.current`) list them
  // truthfully in dependency arrays without eslint's exhaustive-deps losing
  // track of them through this custom hook's boundary.
  const updateSession = useCallback((nextSession: EditorSession): void => {
    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  const reportRefusal = useCallback(
    (reason: string): void => {
      setFeedback(refusalMessage(reason));
    },
    [setFeedback],
  );

  const currentScene = useCallback(
    (): LevelDocument['scene'] => currentEditorAttempt(sessionRef.current).document.scene,
    [],
  );

  const undo = useCallback((): void => {
    updateSession(undoEditorCommand(sessionRef.current).session);
  }, [updateSession]);

  const redo = useCallback((): void => {
    updateSession(redoEditorCommand(sessionRef.current).session);
  }, [updateSession]);

  const selectPlacement = useCallback(
    (placementId: string): void => {
      updateSession(selectEditorPlacement(sessionRef.current, placementId));
    },
    [updateSession],
  );

  const executeCommand = useCallback(
    (command: Parameters<typeof executeEditorCommand>[1]): void => {
      const result = executeEditorCommand(sessionRef.current, command);
      updateSession(result.session);
      if (result.status === 'rejected') reportRefusal(result.reason);
    },
    [updateSession, reportRefusal],
  );

  return {
    session,
    sessionRef,
    feedback,
    setFeedback,
    reportRefusal,
    updateSession,
    currentScene,
    undo,
    redo,
    selectPlacement,
    executeCommand,
  };
}
