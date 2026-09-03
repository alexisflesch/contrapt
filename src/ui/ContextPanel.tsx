import { removePlacement, rotatePlacement } from '../application/construction/construction-attempt';
import {
  currentEditorAttempt,
  type EditorSession,
  type executeEditorCommand,
} from '../application/editor-session/editor-session';
import type { MoveHandleHandlers } from '../app/use-board-pointers';
import { placementName } from './placement-name';

interface ContextPanelProps {
  readonly session: EditorSession;
  readonly moveHandlers: MoveHandleHandlers;
  readonly onExecuteCommand: (command: Parameters<typeof executeEditorCommand>[1]) => void;
}

/**
 * The panel for the currently selected placement: move, rotate (beams only)
 * and remove.
 *
 * Always renders `.context-panel-slot`, never `null` — the same fix B5
 * applied to `LevelResult` (plan-remise-en-jeu.md § 4 bis). This panel is a
 * flex sibling under `.scene-frame` exactly like the result banner was
 * before B5: mounting/unmounting it when a selection appears or disappears
 * resizes the board and refires the `ResizeObserver` in `use-board-camera.ts`.
 * Reserving the slot unconditionally, from the component's first render,
 * keeps `.scene-frame`'s CSS box constant regardless of selection state.
 */
export function ContextPanel({ session, moveHandlers, onExecuteCommand }: ContextPanelProps) {
  const displayedAttempt = currentEditorAttempt(session);
  const selectedPlacement = displayedAttempt.document.objects.find(
    (object) => object.id === session.selectedPlacementId,
  );

  if (selectedPlacement === undefined || session.phase !== 'construction') {
    return <div className="context-panel-slot" />;
  }

  return (
    <div className="context-panel-slot">
      <section
        className="context-panel"
        aria-label={`Objet sélectionné : ${placementName(selectedPlacement)}`}
      >
        <strong>Objet sélectionné : {placementName(selectedPlacement)}</strong>
        {selectedPlacement.permissions.move && (
          <button className="context-action" type="button" {...moveHandlers}>
            Déplacer la {placementName(selectedPlacement).toLowerCase()}
          </button>
        )}
        {selectedPlacement.type === 'beam' && selectedPlacement.permissions.rotate && (
          <button
            className="context-action"
            type="button"
            onClick={() => {
              onExecuteCommand(
                rotatePlacement({
                  context: session.mode === 'resolution' ? 'player' : 'author',
                  placementId: selectedPlacement.id,
                  rotation: selectedPlacement.transform.rotation + Math.PI / 12,
                }),
              );
            }}
          >
            Tourner à droite
          </button>
        )}
        {selectedPlacement.permissions.remove && (
          <button
            className="context-action"
            type="button"
            onClick={() => {
              onExecuteCommand(
                removePlacement({
                  context: session.mode === 'resolution' ? 'player' : 'author',
                  placementId: selectedPlacement.id,
                }),
              );
            }}
          >
            Supprimer la {placementName(selectedPlacement).toLowerCase()}
          </button>
        )}
      </section>
    </div>
  );
}
