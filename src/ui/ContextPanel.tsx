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
 * and remove. Renders `null` when nothing is selected or outside
 * `'construction'` — `App.tsx` mounts this alongside `LevelResult` inside one
 * shared, always-mounted `.status-slot`. The two are mutually exclusive by
 * phase (this only ever has content during `'construction'`, `LevelResult`
 * only during `'result'`), so a single shared reservation is correct and
 * avoids reserving two independent blocks of dead space for content that can
 * never appear at the same time.
 */
export function ContextPanel({ session, moveHandlers, onExecuteCommand }: ContextPanelProps) {
  const displayedAttempt = currentEditorAttempt(session);
  const selectedPlacement = displayedAttempt.document.objects.find(
    (object) => object.id === session.selectedPlacementId,
  );

  if (selectedPlacement === undefined || session.phase !== 'construction') return null;

  return (
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
  );
}
