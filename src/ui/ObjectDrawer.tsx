import type { EditorSession } from '../application/editor-session/editor-session';
import { objectKinds, type ObjectKind } from '../app/object-catalog';
import { spriteThumbnailPath, type SpriteFamily } from '../presentation/sprite-loader';

/** The same art the board draws, pre-composed, so a catalogue card looks like the object it places. */
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

interface ObjectDrawerProps {
  readonly session: EditorSession;
  readonly selectedObject: ObjectKind | undefined;
  readonly isDrawerOpen: boolean;
  readonly isSideLayout: boolean;
  readonly isPlacementActive: boolean;
  readonly onToggleDrawer: () => void;
  readonly onCloseDrawer: () => void;
  readonly onSelectKind: (kind: ObjectKind) => void;
}

/** The catalogue of placeable object families: a collapsible drawer on phones, an open side panel in landscape/tablet. */
export function ObjectDrawer({
  session,
  selectedObject,
  isDrawerOpen,
  isSideLayout,
  isPlacementActive,
  onToggleDrawer,
  onCloseDrawer,
  onSelectKind,
}: ObjectDrawerProps) {
  const drawerIsExpanded = isDrawerOpen || isSideLayout;

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
          <span className="object-count">{objectKinds.length} familles</span>
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
            {objectKinds.map(({ kind, description }) => (
              <button
                className={`object-card${selectedObject === kind ? ' object-card-selected' : ''}`}
                key={kind}
                type="button"
                disabled={session.phase !== 'construction'}
                aria-label={kind === 'Poutre' ? 'Poutre moyenne' : kind}
                aria-pressed={selectedObject === kind}
                onClick={() => {
                  onSelectKind(kind);
                }}
              >
                <span className="object-thumb" aria-hidden="true">
                  <img
                    src={spriteThumbnailPath(spriteFamilyByKind[kind])}
                    alt=""
                    draggable={false}
                  />
                </span>
                <span className="object-card-copy">
                  <strong>{kind}</strong>
                  <span>{description}</span>
                </span>
                <span className="object-card-action" aria-hidden="true">
                  {selectedObject === kind ? '✓' : '+'}
                </span>
              </button>
            ))}
          </div>

          <p className="drawer-hint" aria-live="polite" hidden={!drawerIsExpanded}>
            Touchez un objet pour le sélectionner.
          </p>
        </div>
      </section>
    </>
  );
}
