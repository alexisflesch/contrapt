import type { EditorSession } from '../application/editor-session/editor-session';
import type { ObjectKind } from '../app/object-catalog';

interface SimulationControlsProps {
  readonly session: EditorSession;
  readonly feedback: string | null;
  readonly activePlacementKind: ObjectKind | null;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onCancelPlacement: () => void;
  readonly onLaunchSimulation: () => void;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onRestoreConstruction: () => void;
}

/** The "tester / pause / reset" bar: construction commands while building, playback controls while simulating. */
export function SimulationControls({
  session,
  feedback,
  activePlacementKind,
  onUndo,
  onRedo,
  onCancelPlacement,
  onLaunchSimulation,
  onPause,
  onResume,
  onRestoreConstruction,
}: SimulationControlsProps) {
  return (
    <div
      className="workspace-toolbar"
      aria-label={
        session.phase === 'construction' ? 'Actions de construction' : 'Actions de simulation'
      }
    >
      {session.phase === 'construction' && (
        <>
          <button
            className="toolbar-button"
            type="button"
            disabled={session.history.past.length === 0}
            onClick={onUndo}
          >
            <span aria-hidden="true">↶</span>
            Annuler
          </button>
          <button
            className="toolbar-button"
            type="button"
            disabled={session.history.future.length === 0}
            onClick={onRedo}
          >
            <span aria-hidden="true">↷</span>
            Rétablir
          </button>
          {activePlacementKind !== null && (
            <div className="toolbar-status" aria-live="polite">
              Placement actif : {activePlacementKind}.
              <button className="placement-cancel" type="button" onClick={onCancelPlacement}>
                Annuler le placement
              </button>
            </div>
          )}
          <button className="primary-button" type="button" onClick={onLaunchSimulation}>
            <span aria-hidden="true">▶</span>
            Tester
          </button>
        </>
      )}

      {session.phase !== 'construction' && (
        <div className="toolbar-status" aria-live="polite">
          <strong>
            {session.phase === 'running'
              ? 'Simulation en cours'
              : session.phase === 'paused'
                ? 'Simulation en pause'
                : 'Simulation terminée'}
          </strong>
          {session.phase === 'running' && (
            <button className="placement-cancel" type="button" onClick={onPause}>
              Mettre en pause
            </button>
          )}
          {session.phase === 'paused' && (
            <button className="placement-cancel" type="button" onClick={onResume}>
              Reprendre
            </button>
          )}
          <button className="placement-cancel" type="button" onClick={onRestoreConstruction}>
            Réinitialiser
          </button>
        </div>
      )}

      {feedback !== null && (
        <p className="toolbar-feedback" aria-live="assertive">
          {feedback}
        </p>
      )}
    </div>
  );
}
