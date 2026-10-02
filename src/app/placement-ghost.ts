import { currentEditorAttempt, type EditorSession } from '../application/editor-session';
import type { BoardGhost } from '../presentation/board-renderer';

/**
 * The placement the board draws as a ghost (C1, U1): the object a placement
 * gesture is projecting, once it has a candidate position, and whether that
 * position can be committed. Pure view state: it never touches the document
 * nor the history.
 */
export const placementGhost = (session: EditorSession): BoardGhost | null => {
  const { manipulation } = session;
  if (manipulation?.kind !== 'placement') return null;

  const isProjected = currentEditorAttempt(session).document.objects.some(
    ({ id }) => id === manipulation.placementId,
  );
  if (!isProjected) return null;

  return {
    ghostPlacementId: manipulation.placementId,
    isGhostValid: manipulation.invalidReason === null,
  };
};
