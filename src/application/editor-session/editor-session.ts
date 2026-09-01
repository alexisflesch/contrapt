import type { ConstructionAttempt } from '../construction';
import {
  applyPreview,
  beginCommandGroup,
  cancelCommandGroup,
  commitCommandGroup,
  createHistory,
  executeCommand,
  redo,
  undo,
  type Command,
  type CommandGroup,
  type History,
} from '../history';

type EditorMode = 'resolution' | 'creation';
type EditorPhase = 'construction' | 'running' | 'paused' | 'result';
type EditorManipulationKind = 'placement' | 'move' | 'rotation';

interface EditorManipulation {
  readonly kind: EditorManipulationKind;
  readonly placementId: string;
  readonly group: CommandGroup<ConstructionAttempt>;
}

export interface EditorSession {
  readonly mode: EditorMode;
  readonly phase: EditorPhase;
  readonly history: History<ConstructionAttempt>;
  readonly selectedPlacementId: string | null;
  readonly manipulation: EditorManipulation | null;
  /** Immutable construction snapshot consumed when the simulation is created. */
  readonly simulationSnapshot: ConstructionAttempt | null;
  /** Exact history reference restored when the simulation is reset. */
  readonly historyAtSimulationStart: History<ConstructionAttempt> | null;
}

interface EditorManipulationInput {
  readonly kind: EditorManipulationKind;
  readonly placementId: string;
}

type EditorActionResult =
  | {
      readonly status: 'accepted';
      readonly session: EditorSession;
      readonly recorded: boolean;
    }
  | {
      readonly status: 'rejected';
      readonly session: EditorSession;
      readonly reason: string;
    };

type EditorNavigationResult =
  | {
      readonly status: 'accepted' | 'unavailable';
      readonly session: EditorSession;
    }
  | {
      readonly status: 'rejected';
      readonly session: EditorSession;
      readonly reason: 'editing-unavailable-during-simulation';
    };

type EditorTransitionResult =
  | { readonly status: 'accepted'; readonly session: EditorSession }
  | {
      readonly status: 'rejected';
      readonly session: EditorSession;
      readonly reason: 'invalid-phase-transition';
    };

const freezeSession = (session: EditorSession): EditorSession => Object.freeze(session);

const acceptedAction = (session: EditorSession, recorded = false): EditorActionResult => ({
  status: 'accepted',
  session,
  recorded,
});

const rejectedAction = (session: EditorSession, reason: string): EditorActionResult => ({
  status: 'rejected',
  session,
  reason,
});

const withSession = (session: EditorSession, changes: Partial<EditorSession>): EditorSession =>
  freezeSession({ ...session, ...changes });

const containsPlacement = (attempt: ConstructionAttempt, placementId: string): boolean =>
  attempt.document.objects.some(({ id }) => id === placementId);

const selectedPlacementAfterHistoryChange = (
  session: EditorSession,
  history: History<ConstructionAttempt>,
): string | null => {
  const selectedPlacementId = session.selectedPlacementId;
  if (selectedPlacementId === null) return null;
  return containsPlacement(history.state, selectedPlacementId) ? selectedPlacementId : null;
};

const discardManipulation = (session: EditorSession): EditorSession => {
  const manipulation = session.manipulation;
  if (manipulation === null) return session;

  const cancelled = cancelCommandGroup(manipulation.group);
  return withSession(session, { history: cancelled.history, manipulation: null });
};

const isConstruction = (session: EditorSession): boolean => session.phase === 'construction';

const invalidTransition = (session: EditorSession): EditorTransitionResult => ({
  status: 'rejected',
  session,
  reason: 'invalid-phase-transition',
});

export const createEditorSession = (
  mode: EditorMode,
  attempt: ConstructionAttempt,
): EditorSession =>
  freezeSession({
    mode,
    phase: 'construction',
    history: createHistory(attempt),
    selectedPlacementId: null,
    manipulation: null,
    simulationSnapshot: null,
    historyAtSimulationStart: null,
  });

/** Returns the temporary projection during a gesture, otherwise the committed attempt. */
export const currentEditorAttempt = (session: EditorSession): ConstructionAttempt =>
  session.manipulation?.group.state ?? session.history.state;

/** Selection is ephemeral and therefore never creates a history entry. */
export const selectEditorPlacement = (
  session: EditorSession,
  placementId: string | null,
): EditorSession => {
  const selectedPlacementId =
    placementId !== null && containsPlacement(currentEditorAttempt(session), placementId)
      ? placementId
      : null;

  if (selectedPlacementId === session.selectedPlacementId) return session;
  return withSession(session, { selectedPlacementId });
};

export const executeEditorCommand = (
  session: EditorSession,
  command: Command<ConstructionAttempt>,
): EditorActionResult => {
  if (!isConstruction(session)) {
    return rejectedAction(session, 'editing-unavailable-during-simulation');
  }

  const baseSession = discardManipulation(session);
  const execution = executeCommand(baseSession.history, command);
  if (execution.status === 'rejected') {
    return rejectedAction(baseSession, execution.reason);
  }

  if (!execution.recorded) return acceptedAction(baseSession);

  return acceptedAction(
    withSession(baseSession, {
      history: execution.history,
      selectedPlacementId: selectedPlacementAfterHistoryChange(baseSession, execution.history),
    }),
    true,
  );
};

export const beginEditorManipulation = (
  session: EditorSession,
  input: EditorManipulationInput,
): EditorActionResult => {
  if (!isConstruction(session)) {
    return rejectedAction(session, 'editing-unavailable-during-simulation');
  }

  const baseSession = discardManipulation(session);
  const placementExists = containsPlacement(baseSession.history.state, input.placementId);
  if (input.kind === 'placement' && placementExists) {
    return rejectedAction(baseSession, 'placement-id-already-used');
  }
  if (input.kind !== 'placement' && !placementExists) {
    return rejectedAction(baseSession, 'placement-not-found');
  }

  const manipulation = Object.freeze({
    ...input,
    group: beginCommandGroup(baseSession.history),
  });
  const selectedPlacementId = input.kind === 'placement' ? null : input.placementId;

  return acceptedAction(withSession(baseSession, { manipulation, selectedPlacementId }));
};

export const previewEditorManipulation = (
  session: EditorSession,
  command: Command<ConstructionAttempt>,
): EditorActionResult => {
  if (!isConstruction(session)) {
    return rejectedAction(session, 'editing-unavailable-during-simulation');
  }
  if (session.manipulation === null) {
    return rejectedAction(session, 'no-active-manipulation');
  }

  // Move, rotation and placement commands carry an absolute projection. Reapply
  // each one to the group base so returning to the origin is a true no-op and a
  // placement preview can change position without consuming inventory twice.
  const previewBase = beginCommandGroup(session.manipulation.group.base);
  const preview = applyPreview(previewBase, command);
  if (preview.status === 'rejected') return rejectedAction(session, preview.reason);

  const manipulation = Object.freeze({ ...session.manipulation, group: preview.group });
  return acceptedAction(withSession(session, { manipulation }));
};

export const commitEditorManipulation = (session: EditorSession): EditorActionResult => {
  if (!isConstruction(session)) {
    return rejectedAction(session, 'editing-unavailable-during-simulation');
  }
  if (session.manipulation === null) {
    return rejectedAction(session, 'no-active-manipulation');
  }

  const { manipulation } = session;
  const commit = commitCommandGroup(manipulation.group, session.history);
  if (commit.status === 'rejected') return rejectedAction(session, commit.reason);

  const selectedPlacementId = containsPlacement(commit.history.state, manipulation.placementId)
    ? manipulation.placementId
    : selectedPlacementAfterHistoryChange(session, commit.history);

  return acceptedAction(
    withSession(session, {
      history: commit.history,
      manipulation: null,
      selectedPlacementId,
    }),
    commit.recorded,
  );
};

export const cancelEditorManipulation = (session: EditorSession): EditorActionResult => {
  if (!isConstruction(session)) {
    return rejectedAction(session, 'editing-unavailable-during-simulation');
  }
  if (session.manipulation === null) {
    return rejectedAction(session, 'no-active-manipulation');
  }

  return acceptedAction(discardManipulation(session));
};

const navigateHistory = (
  session: EditorSession,
  direction: 'undo' | 'redo',
): EditorNavigationResult => {
  if (!isConstruction(session)) {
    return {
      status: 'rejected',
      session,
      reason: 'editing-unavailable-during-simulation',
    };
  }

  const baseSession = discardManipulation(session);
  const navigation = direction === 'undo' ? undo(baseSession.history) : redo(baseSession.history);
  if (navigation.status === 'unavailable') {
    return { status: 'unavailable', session: baseSession };
  }

  return {
    status: 'accepted',
    session: withSession(baseSession, {
      history: navigation.history,
      selectedPlacementId: selectedPlacementAfterHistoryChange(baseSession, navigation.history),
    }),
  };
};

export const undoEditorCommand = (session: EditorSession): EditorNavigationResult =>
  navigateHistory(session, 'undo');

export const redoEditorCommand = (session: EditorSession): EditorNavigationResult =>
  navigateHistory(session, 'redo');

export const startSimulation = (session: EditorSession): EditorTransitionResult => {
  if (!isConstruction(session)) return invalidTransition(session);

  const construction = discardManipulation(session);
  return {
    status: 'accepted',
    session: withSession(construction, {
      phase: 'running',
      simulationSnapshot: construction.history.state,
      historyAtSimulationStart: construction.history,
    }),
  };
};

export const pauseSimulation = (session: EditorSession): EditorTransitionResult => {
  if (session.phase !== 'running') return invalidTransition(session);
  return { status: 'accepted', session: withSession(session, { phase: 'paused' }) };
};

export const resumeSimulation = (session: EditorSession): EditorTransitionResult => {
  if (session.phase !== 'paused') return invalidTransition(session);
  return { status: 'accepted', session: withSession(session, { phase: 'running' }) };
};

export const completeSimulation = (session: EditorSession): EditorTransitionResult => {
  if (session.phase !== 'running') return invalidTransition(session);
  return { status: 'accepted', session: withSession(session, { phase: 'result' }) };
};

export const resetSimulation = (session: EditorSession): EditorTransitionResult => {
  if (
    session.phase === 'construction' ||
    session.historyAtSimulationStart === null ||
    session.simulationSnapshot === null
  ) {
    return invalidTransition(session);
  }

  return {
    status: 'accepted',
    session: withSession(session, {
      phase: 'construction',
      history: session.historyAtSimulationStart,
      simulationSnapshot: null,
      historyAtSimulationStart: null,
    }),
  };
};
