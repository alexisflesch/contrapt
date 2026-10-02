import { currentEditorAttempt, type EditorSession } from '../application/editor-session';
import type { BoardGhost } from '../presentation/board-renderer';

/**
 * The placement the board draws as a ghost: the object a placement gesture is
 * projecting, once it has a candidate position, and whether that position can
 * be committed (C1, U1); or the object a move or a turn takes where it cannot
 * be committed, which keeps following the finger as the same invalid ghost
 * (U13). A valid move stays solid. Pure view state: it never touches the
 * document nor the history.
 */
export const placementGhost = (session: EditorSession): BoardGhost | null => {
  const { manipulation } = session;
  if (manipulation === null) return null;
  if (manipulation.kind !== 'placement') {
    return manipulation.invalidReason === null
      ? null
      : { ghostPlacementId: manipulation.placementId, isGhostValid: false };
  }

  const isProjected = currentEditorAttempt(session).document.objects.some(
    ({ id }) => id === manipulation.placementId,
  );
  if (!isProjected) return null;

  return {
    ghostPlacementId: manipulation.placementId,
    isGhostValid: manipulation.invalidReason === null,
  };
};
