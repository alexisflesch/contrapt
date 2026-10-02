import { currentEditorAttempt, type EditorSession } from '../application/editor-session';
import { constrainingBuildZones, type BoardZone } from '../presentation/board-renderer';

/**
 * The build zones the board shows (U13): while the player builds, every zone
 * that restricts where an object may go, so a refusal is never a surprise.
 * None for the author, whom the zones do not restrict, nor during a
 * simulation. Pure view state, like the selection.
 */
export const highlightedBuildZones = (session: EditorSession): readonly BoardZone[] =>
  session.mode === 'resolution' && session.phase === 'construction'
    ? constrainingBuildZones(currentEditorAttempt(session).document)
    : [];
