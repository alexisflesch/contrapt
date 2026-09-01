import { useState, useSyncExternalStore } from 'react';

type ObjectKind = 'Balle' | 'Panier' | 'Poutre' | 'Bascule';

const objectKinds: readonly { kind: ObjectKind; description: string }[] = [
  { kind: 'Balle', description: 'Un corps libre entraîné par la gravité' },
  { kind: 'Panier', description: 'La cible finale de la scène' },
  { kind: 'Poutre', description: 'Trois longueurs pour guider la balle' },
  { kind: 'Bascule', description: 'Une bascule préassemblée' },
];

function subscribeToSideLayout(onChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener('resize', onChange);
  window.addEventListener('orientationchange', onChange);

  return () => {
    window.removeEventListener('resize', onChange);
    window.removeEventListener('orientationchange', onChange);
  };
}

function getSideLayoutSnapshot() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return (
    window.innerWidth >= 680 || (window.innerWidth >= 560 && window.innerWidth > window.innerHeight)
  );
}

export function App() {
  const [selectedObject, setSelectedObject] = useState<ObjectKind | undefined>();
  const isSideLayout = useSyncExternalStore(
    subscribeToSideLayout,
    getSideLayoutSnapshot,
    () => false,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerIsOpen = isDrawerOpen || isSideLayout;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            +
          </span>
          <h1>Contrapt!</h1>
        </div>
        <p className="level-label">
          <span>Atelier de niveau</span>
          <span className="level-mode">Éditeur libre</span>
        </p>
        <button className="icon-button" type="button" aria-label="Ouvrir le menu">
          <span aria-hidden="true">☰</span>
        </button>
      </header>

      <main className="app-main">
        <section className="workspace" aria-label="Espace de construction">
          <div className="workspace-toolbar" aria-label="Actions de construction">
            <button className="toolbar-button" type="button" disabled>
              <span aria-hidden="true">↶</span>
              Annuler
            </button>
            <button className="toolbar-button" type="button" disabled>
              <span aria-hidden="true">↷</span>
              Rétablir
            </button>
            <button className="primary-button" type="button" disabled>
              <span aria-hidden="true">▶</span>
              Tester
            </button>
          </div>

          <div className="scene-frame" role="region" aria-label="Plateau de jeu">
            <div className="scene-grid" aria-hidden="true" />
            <div className="scene-copy">
              <span className="scene-kicker">Éditeur · zone de construction</span>
              <strong>Préparez votre machine</strong>
              <span>Le plateau est prêt pour votre prochaine construction.</span>
            </div>
            <div className="scene-ground" aria-hidden="true" />
          </div>

          <div className="camera-controls" aria-label="Cadrage du plateau">
            <button className="camera-button" type="button" aria-label="Zoom arrière">
              −
            </button>
            <button className="camera-button camera-reset" type="button">
              Ajuster à la scène
            </button>
            <button className="camera-button" type="button" aria-label="Zoom avant">
              +
            </button>
          </div>
        </section>

        {drawerIsOpen && (
          <button
            className="drawer-scrim"
            type="button"
            aria-label="Fermer le catalogue"
            onClick={() => {
              setIsDrawerOpen(false);
            }}
          />
        )}

        <section
          className={`object-drawer${drawerIsOpen ? '' : ' object-drawer-collapsed'}`}
          aria-label="Objets disponibles"
        >
          <div className="drawer-handle" aria-hidden="true" />
          <div className="drawer-heading">
            <div>
              <span className="eyebrow">Catalogue</span>
              <h2>Objets disponibles</h2>
            </div>
            <span className="object-count">4 familles</span>
            <button
              className="drawer-toggle"
              type="button"
              aria-controls="object-list"
              aria-expanded={drawerIsOpen}
              aria-label={drawerIsOpen ? 'Replier le catalogue' : 'Ouvrir le catalogue'}
              onClick={() => {
                setIsDrawerOpen((current) => !current);
              }}
            >
              <span aria-hidden="true">{drawerIsOpen ? '⌄' : '⌃'}</span>
            </button>
          </div>

          <div className="drawer-content">
            <div className="object-list" id="object-list" hidden={!drawerIsOpen}>
              {objectKinds.map(({ kind, description }) => (
                <button
                  className={`object-card${selectedObject === kind ? ' object-card-selected' : ''}`}
                  key={kind}
                  type="button"
                  aria-pressed={selectedObject === kind}
                  onClick={() => {
                    setSelectedObject((current) => (current === kind ? undefined : kind));
                  }}
                >
                  <span
                    className={`object-shape object-shape-${kind.toLowerCase()}`}
                    aria-hidden="true"
                  >
                    <span />
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

            <p className="drawer-hint" aria-live="polite" hidden={!drawerIsOpen}>
              {selectedObject === undefined
                ? 'Touchez un objet pour le sélectionner.'
                : `Objet sélectionné : ${selectedObject}.`}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
