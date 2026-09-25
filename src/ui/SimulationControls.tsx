import {
  currentEditorAttempt,
  type EditorSession,
} from '../application/editor-session/editor-session';
import type { ObjectKind } from '../app/object-catalog';
import { Button } from './Button';

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
  // A session with no inventory (level 1: `initial-progression.md` § Niveau 1,
  // "Aucune action d'édition") has nothing a command could ever undo or redo:
  // hiding these buttons outright, rather than just disabling them, keeps the
  // action bar limited to what B1 (plan-remise-en-jeu.md § 4) allows.
  const hasInventory = currentEditorAttempt(session).document.inventory.length > 0;

  return (
    <div
      className="workspace-toolbar"
      aria-label={
        session.phase === 'construction' ? 'Actions de construction' : 'Actions de simulation'
      }
    >
      {session.phase === 'construction' && (
        <>
          {hasInventory && (
            <div className="toolbar-group">
              <Button
                className="toolbar-button"
                disabled={session.history.past.length === 0}
                onClick={onUndo}
              >
                <span aria-hidden="true">↶</span>
                <span className="toolbar-button-label">Annuler</span>
              </Button>
              <Button
                className="toolbar-button"
                disabled={session.history.future.length === 0}
                onClick={onRedo}
              >
                <span aria-hidden="true">↷</span>
                <span className="toolbar-button-label">Rétablir</span>
              </Button>
            </div>
          )}
          {activePlacementKind !== null && (
            <div className="toolbar-status" aria-live="polite">
              <span className="toolbar-status-text">Placement actif : {activePlacementKind}.</span>
              <Button className="placement-cancel" onClick={onCancelPlacement}>
                {/* Short visible form for narrow toolbars; the accessible name stays the full label. */}
                <span className="placement-cancel-short" aria-hidden="true">
                  ✕<span className="placement-cancel-kind"> {activePlacementKind}</span>
                </span>
                <span className="placement-cancel-label">Annuler le placement</span>
              </Button>
            </div>
          )}
          <Button tone="go" className="toolbar-primary" onClick={onLaunchSimulation}>
            <span aria-hidden="true">▶</span>
            Tester
          </Button>
        </>
      )}

      {session.phase !== 'construction' && (
        <div className="toolbar-status" aria-live="polite">
          <strong className="toolbar-status-text">
            {session.phase === 'running'
              ? 'Simulation en cours'
              : session.phase === 'paused'
                ? 'Simulation en pause'
                : 'Simulation terminée'}
          </strong>
          {session.phase === 'running' && (
            <Button tone="pause" onClick={onPause}>
              <span aria-hidden="true">❚❚</span>
              Mettre en pause
            </Button>
          )}
          {session.phase === 'paused' && (
            <Button tone="go" onClick={onResume}>
              <span aria-hidden="true">▶</span>
              Reprendre
            </Button>
          )}
          <Button tone="reset" onClick={onRestoreConstruction}>
            <span aria-hidden="true">↺</span>
            Réinitialiser
          </Button>
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
