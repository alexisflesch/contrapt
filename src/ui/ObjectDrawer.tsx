import {
  currentEditorAttempt,
  type EditorSession,
} from '../application/editor-session/editor-session';
import {
  authorCatalogue,
  inventoryTypeByObjectKind,
  objectKinds,
  type AuthorCatalogueEntry,
  type ObjectKind,
} from '../app/object-catalog';
import type { PlacementSource } from '../app/use-board-pointers';
import type { LevelDocument } from '../domain/level-document';
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

interface DrawerCard {
  readonly key: string;
  readonly kind: ObjectKind;
  readonly name: string;
  readonly accessibleName: string;
  readonly detail: string;
  readonly thumbnail: SpriteThumbnail;
  readonly isDepleted: boolean;
  readonly source: PlacementSource;
}

type InventoryEntry = LevelDocument['inventory'][number];

const authorCard = (entry: AuthorCatalogueEntry): DrawerCard => ({
  key: entry.key,
  kind: entry.kind,
  name: entry.name,
  accessibleName: entry.accessibleName,
  detail: entry.description,
  // The red ball is the goal's; any other ball is blue.
  thumbnail:
    entry.type === 'ball' && !entry.becomesGoalBall
      ? 'second-ball'
      : spriteFamilyByKind[entry.kind],
  isDepleted: false,
  source: { from: 'catalogue', entry },
});

const inventoryCards = (inventoryEntry: InventoryEntry): DrawerCard[] => {
  const catalogEntry = objectKinds.find(
    ({ kind }) => inventoryTypeByObjectKind[kind] === inventoryEntry.type,
  );
  if (catalogEntry === undefined) return [];
  const { kind } = catalogEntry;
  const name =
    inventoryEntry.type === 'beam' ? `Poutre ${beamSizeLabels[inventoryEntry.props.size]}` : kind;
  const quantity = String(inventoryEntry.quantity);
  return [
    {
      key: inventoryEntry.id,
      kind,
      name,
      accessibleName: `${name}, quantité : ${quantity}`,
      detail: `Quantité : ${quantity}`,
      thumbnail: playerThumbnail(spriteFamilyByKind[kind]),
      isDepleted: inventoryEntry.quantity === 0,
      source: { from: 'inventory', inventoryEntryId: inventoryEntry.id },
    },
  ];
};

interface ObjectDrawerProps {
  readonly session: EditorSession;
  readonly selectedObject: ObjectKind | undefined;
  /** Key of the card the active placement tool came from. */
  readonly selectedEntryKey: string | undefined;
  readonly isDrawerOpen: boolean;
  readonly isSideLayout: boolean;
  readonly isPlacementActive: boolean;
  readonly onToggleDrawer: () => void;
  readonly onCloseDrawer: () => void;
  readonly onSelectKind: (kind: ObjectKind, source: PlacementSource) => void;
}

/**
 * The catalogue of placeable objects: a collapsible drawer on phones, an open
 * side panel in landscape/tablet. The player sees the level's inventory; the
 * author sees every family, and places it outside any inventory.
 */
export function ObjectDrawer({
  session,
  selectedObject,
  selectedEntryKey,
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
  const drawerCards =
    inventory === null ? authorCatalogue.map(authorCard) : inventory.flatMap(inventoryCards);
  const objectCountLabel =
    inventory === null
      ? `${String(drawerCards.length)} objets`
      : `${String(drawerCards.length)} ${drawerCards.length === 1 ? 'entrée' : 'entrées'}`;

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
            {drawerCards.map((card) => {
              const isSelected = selectedObject === card.kind && selectedEntryKey === card.key;

              return (
                <button
                  className={`object-card${isSelected ? ' object-card-selected' : ''}`}
                  key={card.key}
                  type="button"
                  disabled={session.phase !== 'construction' || card.isDepleted}
                  aria-label={card.accessibleName}
                  aria-pressed={isSelected}
                  onClick={() => {
                    onSelectKind(card.kind, card.source);
                  }}
                >
                  <span className="object-thumb" aria-hidden="true">
                    <img src={spriteThumbnailPath(card.thumbnail)} alt="" draggable={false} />
                  </span>
                  <span className="object-card-copy">
                    <strong>{card.name}</strong>
                    <span>{card.detail}</span>
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
