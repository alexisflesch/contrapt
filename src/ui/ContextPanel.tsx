import {
  disconnectControlWire,
  movePlacement,
  removePlacement,
  rotatePlacement,
  updatePlacementProperties,
} from '../application/construction/construction-attempt';
import { controlCircuits } from '../domain/control-circuits';
import {
  currentEditorAttempt,
  type EditorSession,
  type executeEditorCommand,
} from '../application/editor-session/editor-session';
import { Button } from './Button';
import { Panel } from './Panel';
import { placementName, placementNameWithArticle } from './placement-name';

interface ContextPanelProps {
  readonly session: EditorSession;
  readonly onExecuteCommand: (command: Parameters<typeof executeEditorCommand>[1]) => void;
  readonly onClose?: () => void;
  /** The lever waiting for a conveyor tap, if a link is being made (ADR 0009). */
  readonly wiringSourceId?: string | null;
  readonly onStartWiring?: (sourceId: string) => void;
  readonly onCancelWiring?: () => void;
}

const POSITION_STEP_IN_WORLD_UNITS = 0.25;
const ROTATION_STEP_IN_RADIANS = Math.PI / 12;
/** Display-only twin of `ROTATION_STEP_IN_RADIANS` (π/12), shown on the rotation buttons. */
const ROTATION_STEP_IN_DEGREES = 15;
type BeamSize = 'short' | 'medium' | 'long';

const beamSizeFromValue = (value: string): BeamSize | null => {
  if (value === 'short' || value === 'medium' || value === 'long') return value;
  return null;
};

const leverPositionFromValue = (value: string): 'left' | 'center' | 'right' | null =>
  value === 'left' || value === 'center' || value === 'right' ? value : null;

const conveyorDirectionFromValue = (value: string): 'left' | 'stopped' | 'right' | null =>
  value === 'left' || value === 'stopped' || value === 'right' ? value : null;

/**
 * The panel for the currently selected placement: move, rotate (beams only)
 * and remove. Renders `null` when nothing is selected or outside
 * `'construction'` — `BoardShell` hands it to `InspectorDrawer`, which shows it
 * in the right rail (wide) or as a compact sheet, next to `LevelResult`. The two are mutually exclusive by
 * phase (this only ever has content during `'construction'`, `LevelResult`
 * only during `'result'`), so a single shared reservation is correct and
 * avoids reserving two independent blocks of dead space for content that can
 * never appear at the same time.
 */
export function ContextPanel({
  session,
  onExecuteCommand,
  onClose,
  wiringSourceId = null,
  onStartWiring,
  onCancelWiring,
}: ContextPanelProps) {
  const displayedAttempt = currentEditorAttempt(session);
  const selectedPlacement = displayedAttempt.document.objects.find(
    (object) => object.id === session.selectedPlacementId,
  );

  if (selectedPlacement === undefined || session.phase !== 'construction') return null;

  const canEdit = session.mode === 'creation';
  const canMove = canEdit || selectedPlacement.permissions.move;
  const canRotate = canEdit || selectedPlacement.permissions.rotate;
  const canRemove = canEdit || selectedPlacement.permissions.remove;
  const { wires } = displayedAttempt.document;
  const circuits = controlCircuits(wires);
  const circuitLabel = (sourceId: string): string =>
    circuits.find((circuit) => circuit.sourceId === sourceId)?.label ?? '';
  const connectedWires = wires.filter(
    ({ sourceId, targetId }) =>
      sourceId === selectedPlacement.id || targetId === selectedPlacement.id,
  );
  const disconnect = (wireId: string): void => {
    onExecuteCommand(disconnectControlWire({ context: 'author', wireId }));
  };

  const moveSteps = [
    ['gauche', '←', -POSITION_STEP_IN_WORLD_UNITS, 0],
    ['droite', '→', POSITION_STEP_IN_WORLD_UNITS, 0],
    ['haut', '↑', 0, -POSITION_STEP_IN_WORLD_UNITS],
    ['bas', '↓', 0, POSITION_STEP_IN_WORLD_UNITS],
  ] as const;

  return (
    <Panel
      className="context-panel"
      label={`Propriétés de ${placementName(selectedPlacement)}`}
      title="Propriétés"
      headerAction={
        onClose === undefined ? undefined : (
          <button
            className="panel-close"
            type="button"
            aria-label="Fermer les propriétés"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        )
      }
    >
      <p className="context-identity">{placementName(selectedPlacement)}</p>
      {!canMove && !canRotate && !canRemove && (
        <p className="context-restriction">
          Cet objet est verrouillé : ses actions sont indisponibles.
        </p>
      )}
      {canMove && (
        <div className="context-move-controls" aria-label="Déplacer par pas">
          {moveSteps.map(([direction, glyph, horizontal, vertical]) => (
            <Button
              key={direction}
              aria-label={`Vers la ${direction}`}
              onClick={() => {
                onExecuteCommand(
                  movePlacement({
                    context: session.mode === 'resolution' ? 'player' : 'author',
                    placementId: selectedPlacement.id,
                    position: {
                      x: selectedPlacement.transform.position.x + horizontal,
                      y: selectedPlacement.transform.position.y + vertical,
                    },
                  }),
                );
              }}
            >
              <span aria-hidden="true">{glyph}</span>
            </Button>
          ))}
        </div>
      )}
      {selectedPlacement.type === 'beam' && canRotate && (
        <div className="context-rotation-controls">
          {(['négative', 'positive'] as const).map((direction) => (
            <Button
              key={direction}
              aria-label={`Rotation ${direction}`}
              onClick={() => {
                onExecuteCommand(
                  rotatePlacement({
                    context: session.mode === 'resolution' ? 'player' : 'author',
                    placementId: selectedPlacement.id,
                    rotation:
                      selectedPlacement.transform.rotation +
                      (direction === 'positive'
                        ? ROTATION_STEP_IN_RADIANS
                        : -ROTATION_STEP_IN_RADIANS),
                  }),
                );
              }}
            >
              <span aria-hidden="true">{direction === 'positive' ? '↻' : '↺'}</span>
              {ROTATION_STEP_IN_DEGREES}°
            </Button>
          ))}
        </div>
      )}
      {selectedPlacement.type === 'beam' && session.mode === 'creation' && (
        <label className="context-size-control">
          Longueur de la poutre
          <select
            aria-label="Longueur de la poutre"
            value={selectedPlacement.props.size}
            onChange={(event) => {
              const size = beamSizeFromValue(event.target.value);
              if (size === null) return;
              onExecuteCommand(
                updatePlacementProperties({
                  context: 'author',
                  placementId: selectedPlacement.id,
                  props: { size },
                }),
              );
            }}
          >
            <option value="short">Courte</option>
            <option value="medium">Moyenne</option>
            <option value="long">Longue</option>
          </select>
        </label>
      )}
      {selectedPlacement.type === 'lever' && canEdit && (
        <label className="context-size-control">
          Position de départ
          <select
            aria-label="Position de départ"
            value={selectedPlacement.props.position}
            onChange={(event) => {
              const position = leverPositionFromValue(event.target.value);
              if (position === null) return;
              onExecuteCommand(
                updatePlacementProperties({
                  context: 'author',
                  placementId: selectedPlacement.id,
                  props: { position },
                }),
              );
            }}
          >
            <option value="left">Gauche</option>
            <option value="center">Centre</option>
            <option value="right">Droite</option>
          </select>
        </label>
      )}
      {selectedPlacement.type === 'conveyor' && canEdit && connectedWires.length === 0 && (
        <label className="context-size-control">
          Sens du tapis
          <select
            aria-label="Sens du tapis"
            value={selectedPlacement.props.direction}
            onChange={(event) => {
              const direction = conveyorDirectionFromValue(event.target.value);
              if (direction === null) return;
              onExecuteCommand(
                updatePlacementProperties({
                  context: 'author',
                  placementId: selectedPlacement.id,
                  props: { direction },
                }),
              );
            }}
          >
            <option value="left">Vers la gauche</option>
            <option value="stopped">Arrêté</option>
            <option value="right">Vers la droite</option>
          </select>
        </label>
      )}
      {connectedWires.length > 0 && (
        <ul className="context-circuits" aria-label="Circuits">
          {connectedWires.map((wire, index) => {
            const label = circuitLabel(wire.sourceId);
            const name =
              connectedWires.length === 1
                ? `Délier le circuit ${label}`
                : `Délier le circuit ${label} (fil ${String(index + 1)})`;
            return (
              <li key={wire.id}>
                <span>Circuit {label}</span>
                {selectedPlacement.type === 'conveyor' && <span> : commandé par un levier</span>}
                {canEdit && (
                  <Button
                    aria-label={name}
                    onClick={() => {
                      disconnect(wire.id);
                    }}
                  >
                    Délier
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {selectedPlacement.type === 'lever' &&
        canEdit &&
        onStartWiring !== undefined &&
        (wiringSourceId === selectedPlacement.id ? (
          <div className="context-wiring" role="status">
            <p>Touchez le convoyeur à relier à ce levier.</p>
            <Button onClick={onCancelWiring}>Annuler la liaison</Button>
          </div>
        ) : (
          <Button
            onClick={() => {
              onStartWiring(selectedPlacement.id);
            }}
          >
            Relier à un convoyeur
          </Button>
        ))}
      {canRemove && (
        <Button
          className="context-delete"
          onClick={() => {
            onExecuteCommand(
              removePlacement({
                context: session.mode === 'resolution' ? 'player' : 'author',
                placementId: selectedPlacement.id,
              }),
            );
          }}
        >
          Supprimer {placementNameWithArticle(selectedPlacement)}
        </Button>
      )}
    </Panel>
  );
}
