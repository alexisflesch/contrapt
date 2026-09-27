import {
  currentEditorAttempt,
  type EditorSession,
} from '../application/editor-session/editor-session';
import { inventoryTypeByObjectKind, objectKinds, type ObjectKind } from '../app/object-catalog';
import {
  spriteThumbnailPath,
  type SpriteFamily,
  type SpriteThumbnail,
} from '../presentation/sprite-loader';

/** The same art the board draws, pre-composed, so a catalogue card looks like the object it places. */
const beamSizeLabels = { short: 'courte', medium: 'moyenne', long: 'longue' } as const;

const spriteFamilyByKind: Readonly<Record<ObjectKind, SpriteFamily>> = {
  Balle: 'ball',
  Panier: 'basket',
  Poutre: 'beam',
  Bascule: 'seesaw',
  Masse: 'mass',
  Levier: 'lever',
  Convoyeur: 'conveyor',
  Bouton: 'button',
  Ventilateur: 'fan',
  Barrière: 'barrier',
  Tremplin: 'springboard',
};

/** A ball from the player's inventory is never the goal's: it is drawn blue. */
const playerThumbnail = (family: SpriteFamily): SpriteThumbnail =>
  family === 'ball' ? 'second-ball' : family;

interface ObjectDrawerProps {
  readonly session: EditorSession;
  readonly selectedObject: ObjectKind | undefined;
  readonly selectedInventoryEntryId: string | undefined;
  readonly isDrawerOpen: boolean;
  readonly isSideLayout: boolean;
  readonly isPlacementActive: boolean;
  readonly onToggleDrawer: () => void;
  readonly onCloseDrawer: () => void;
  readonly onSelectKind: (kind: ObjectKind, inventoryEntryId?: string) => void;
}

/** The catalogue of placeable object families: a collapsible drawer on phones, an open side panel in landscape/tablet. */
export function ObjectDrawer({
  session,
  selectedObject,
  selectedInventoryEntryId,
  isDrawerOpen,
  isSideLayout,
  isPlacementActive,
  onToggleDrawer,
  onCloseDrawer,
  onSelectKind,
}: ObjectDrawerProps) {
  const drawerIsExpanded = isDrawerOpen || isSideLayout;
  const inventory =
    session.mode === 'resolution' ? currentEditorAttempt(session).document.inventory : null;
  const drawerEntries =
    inventory === null
      ? objectKinds.map((catalogEntry) => ({ ...catalogEntry, inventoryEntry: undefined }))
      : inventory.flatMap((inventoryEntry) => {
          const catalogEntry = objectKinds.find(
            ({ kind }) => inventoryTypeByObjectKind[kind] === inventoryEntry.type,
          );
          return catalogEntry === undefined ? [] : [{ ...catalogEntry, inventoryEntry }];
        });
  const objectCountLabel =
    inventory === null
      ? `${String(drawerEntries.length)} familles`
      : `${String(drawerEntries.length)} ${drawerEntries.length === 1 ? 'entrée' : 'entrées'}`;

  return (
    <>
      {isDrawerOpen && !isSideLayout && !isPlacementActive && (
        <button
          className="drawer-scrim"
          type="button"
          aria-label="Fermer"
          onClick={onCloseDrawer}
        />
      )}

      <section
        className={`object-drawer${drawerIsExpanded ? '' : ' object-drawer-collapsed'}`}
        aria-label="Objets disponibles"
      >
        <div className="drawer-handle" aria-hidden="true" />
        <div className="drawer-heading">
          <div>
            <span className="eyebrow">Catalogue</span>
            <h2>Objets disponibles</h2>
          </div>
          <span className="object-count">{objectCountLabel}</span>
          <button
            className="drawer-toggle"
            type="button"
            aria-controls="object-list"
            aria-expanded={drawerIsExpanded}
            aria-label={drawerIsExpanded ? 'Replier le catalogue' : 'Ouvrir le catalogue'}
            onClick={onToggleDrawer}
          >
            <span aria-hidden="true">{drawerIsExpanded ? '⌄' : '⌃'}</span>
          </button>
          {drawerIsExpanded && !isSideLayout && (
            <button
              className="drawer-close"
              type="button"
              aria-label="Fermer le catalogue"
              onClick={onCloseDrawer}
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>

        <div className="drawer-content">
          <div className="object-list" id="object-list" hidden={!drawerIsExpanded}>
            {drawerEntries.map(({ kind, description, inventoryEntry }) => {
              const beamSizeLabel =
                inventoryEntry?.type === 'beam'
                  ? beamSizeLabels[inventoryEntry.props.size]
                  : undefined;
              const displayName =
                kind === 'Poutre' && beamSizeLabel !== undefined ? `Poutre ${beamSizeLabel}` : kind;
              const isSelected =
                selectedObject === kind &&
                (inventoryEntry === undefined || selectedInventoryEntryId === inventoryEntry.id);

              return (
                <button
                  className={`object-card${isSelected ? ' object-card-selected' : ''}`}
                  key={inventoryEntry?.id ?? kind}
                  type="button"
                  disabled={session.phase !== 'construction' || inventoryEntry?.quantity === 0}
                  aria-label={
                    inventoryEntry === undefined
                      ? kind === 'Poutre'
                        ? 'Poutre moyenne'
                        : kind
                      : `${displayName}, quantité : ${String(inventoryEntry.quantity)}`
                  }
                  aria-pressed={isSelected}
                  onClick={() => {
                    onSelectKind(kind, inventoryEntry?.id);
                  }}
                >
                  <span className="object-thumb" aria-hidden="true">
                    <img
                      src={spriteThumbnailPath(
                        inventoryEntry === undefined
                          ? spriteFamilyByKind[kind]
                          : playerThumbnail(spriteFamilyByKind[kind]),
                      )}
                      alt=""
                      draggable={false}
                    />
                  </span>
                  <span className="object-card-copy">
                    <strong>{displayName}</strong>
                    <span>
                      {inventoryEntry === undefined
                        ? description
                        : `Quantité : ${String(inventoryEntry.quantity)}`}
                    </span>
                  </span>
                  <span className="object-card-action" aria-hidden="true">
                    {isSelected ? '✓' : '+'}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="drawer-hint" aria-live="polite" hidden={!drawerIsExpanded}>
            Touchez un objet pour le sélectionner.
          </p>
        </div>
      </section>
    </>
  );
}
