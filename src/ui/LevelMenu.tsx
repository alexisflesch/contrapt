interface LevelMenuProps {
  readonly isOpen: boolean;
  readonly isLevelListOpen: boolean;
  readonly onOpenLevelList: () => void;
  readonly onLaunchLevelOne: () => void;
}

/** The main menu overlay: today, a single entry point into the level list (only level 1 is embedded so far). */
export function LevelMenu({
  isOpen,
  isLevelListOpen,
  onOpenLevelList,
  onLaunchLevelOne,
}: LevelMenuProps) {
  if (!isOpen) return null;

  return (
    <section className="level-menu" aria-label="Menu principal">
      <button type="button" className="context-action" onClick={onOpenLevelList}>
        Liste des niveaux
      </button>
      {isLevelListOpen && (
        <section className="level-list" aria-label="Liste des niveaux">
          <p>Niveau 1 · Laisser tomber</p>
          <button type="button" className="primary-button" onClick={onLaunchLevelOne}>
            Lancer le niveau 1
          </button>
        </section>
      )}
    </section>
  );
}
